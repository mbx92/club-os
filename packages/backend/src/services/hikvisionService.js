'use strict';

/**
 * Hikvision ISAPI Service
 *
 * HTTP Digest wrapper for communicating with Hikvision DS-K1T8003MF devices.
 * Handles both pulling attendance events and managing users on the device.
 *
 * Note: This device model does NOT have web UI or schedule management,
 * so all configuration is done via ISAPI HTTP calls from this service.
 */

const { DigestClient } = require('digest-fetch');
const logger = require('../utils/logger');

/** Default request timeout (ms) — 10 seconds */
const REQUEST_TIMEOUT = 10_000;

/** Common ISAPI ports to try during auto-discovery */
const COMMON_PORTS = [80, 8000, 443];

/**
 * In-memory enrollment lock.
 * While a device is in enrollment mode, sync jobs must NOT send
 * any ISAPI request to that device — it would kick the device
 * out of enrollment mode.
 *
 * Map<deviceId, { lockedAt: Date, expiresAt: Date, employeeNo: string }>
 */
const _enrollmentLocks = new Map();

class HikvisionService {
  /**
   * Create a Digest-authenticated HTTP client for a device
   * @param {Object} device - HikvisionDevice model instance
   * @returns {DigestFetch} client
   */
  static createClient(device) {
    return new DigestClient(device.username, device.password, {
      algorithm: 'MD5',
    });
  }

  /**
   * Build base URL for a device
   */
  static baseUrl(device) {
    return `http://${device.ipAddress}:${device.port}`;
  }

  /**
   * Fetch with timeout support
   * @param {DigestFetch} client
   * @param {string} url
   * @param {Object} options - fetch options
   * @param {number} [timeoutMs] - timeout in milliseconds
   */
  static async fetchWithTimeout(client, url, options = {}, timeoutMs = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await client.fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms — device not reachable at ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ========================================
  // Connection & Device Info
  // ========================================

  /**
   * Test connection to a Hikvision device.
   * If connection fails on configured port, auto-tries common ISAPI ports (80, 8000, 443).
   *
   * @param {Object} device - { ipAddress, port, username, password }
   * @returns {{ success: boolean, deviceInfo?: Object, error?: string, discoveredPort?: number }}
   */
  static async testConnection(device) {
    // Try the configured port first
    const result = await this._tryConnect(device, device.port);
    if (result.success) return result;

    // Configured port failed — try auto-discover other common ports
    logger.info('Hikvision testConnection: configured port failed, trying auto-discover', {
      ip: device.ipAddress,
      configuredPort: device.port,
      error: result.error,
    });

    for (const port of COMMON_PORTS) {
      if (port === device.port) continue; // already tried

      const altResult = await this._tryConnect(device, port);
      if (altResult.success) {
        altResult.discoveredPort = port;
        altResult.message = `Device responded on port ${port} (configured: ${device.port}). Update device port to ${port}.`;
        logger.info('Hikvision auto-discovered port', {
          ip: device.ipAddress,
          discoveredPort: port,
        });
        return altResult;
      }
    }

    // All ports failed
    return {
      success: false,
      error: `Device not reachable on any port (tried: ${device.port}, ${COMMON_PORTS.filter(p => p !== device.port).join(', ')}). Check IP address, network connectivity, and device power.`,
      triedPorts: [device.port, ...COMMON_PORTS.filter(p => p !== device.port)],
    };
  }

  /**
   * Try to connect to a device on a specific port
   * @private
   */
  static async _tryConnect(device, port) {
    try {
      const tempDevice = { ...device.toJSON ? device.toJSON() : device, port };
      const client = this.createClient(tempDevice);
      const url = `http://${tempDevice.ipAddress}:${port}/ISAPI/System/deviceInfo`;

      const response = await this.fetchWithTimeout(client, url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }, 5000); // shorter timeout for port discovery (5s)

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          port,
        };
      }

      // deviceInfo may return XML; try JSON first
      const text = await response.text();
      let deviceInfo;
      try {
        deviceInfo = JSON.parse(text);
      } catch {
        // Some Hikvision devices return XML — try to extract serial number from XML
        const serialMatch = text.match(/<serialNumber>(.*?)<\/serialNumber>/i);
        const modelMatch = text.match(/<model>(.*?)<\/model>/i);
        const nameMatch = text.match(/<deviceName>(.*?)<\/deviceName>/i);
        deviceInfo = {
          serialNumber: serialMatch ? serialMatch[1] : null,
          model: modelMatch ? modelMatch[1] : null,
          deviceName: nameMatch ? nameMatch[1] : null,
          rawResponse: text.substring(0, 500),
        };
      }

      // Extract serial number from JSON or parsed XML
      const serialNumber = deviceInfo.serialNumber
        || deviceInfo.DeviceInfo?.serialNumber
        || deviceInfo.serialNo
        || null;

      return { success: true, deviceInfo, port, serialNumber };
    } catch (err) {
      return { success: false, error: err.message, port };
    }
  }

  // ========================================
  // Attendance Event Pull (ISAPI)
  // ========================================

  /**
   * Pull attendance events from a device for a given time range.
   * Uses POST /ISAPI/AccessControl/AcsEvent/SearchCondition?format=json
   *
   * @param {Object} device - HikvisionDevice instance
   * @param {Date}   startTime
   * @param {Date}   endTime
   * @param {number} [searchPosition=0] - pagination offset
   * @returns {Object[]} array of event objects
   */
  static async pullEvents(device, startTime, endTime, searchPosition = 0) {
    const client = this.createClient(device);
    const url = `${this.baseUrl(device)}/ISAPI/AccessControl/AcsEvent?format=json`;

    const formattedStart = this.formatISO(startTime);
    const formattedEnd = this.formatISO(endTime);

    const body = {
      AcsEventCond: {
        searchID: `search_${Date.now()}`,
        searchResultPosition: searchPosition,
        maxResults: 30,
        major: 0, // 0 = all events
        minor: 0,
        startTime: formattedStart,
        endTime: formattedEnd,
      },
    };

    logger.info('Hikvision pullEvents request', {
      deviceId: device.id,
      ip: device.ipAddress,
      startTime: formattedStart,
      endTime: formattedEnd,
      searchPosition,
    });

    try {
      const response = await this.fetchWithTimeout(client, url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      // Response may be JSON string — parse safely
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        logger.error('Hikvision pullEvents: non-JSON response', {
          deviceId: device.id,
          responsePreview: text.substring(0, 500),
        });
        return [];
      }

      // Handle both array and nested object format for InfoList
      let events;
      const infoList = data?.AcsEvent?.InfoList;
      if (Array.isArray(infoList)) {
        events = infoList;
      } else if (infoList && Array.isArray(infoList.AcsEventInfo)) {
        // Some firmware: { InfoList: { AcsEventInfo: [...] } }
        events = infoList.AcsEventInfo;
      } else {
        events = [];
      }
      const totalMatches = data?.AcsEvent?.totalMatches || 0;

      logger.info('Hikvision pullEvents response', {
        deviceId: device.id,
        eventsInPage: events.length,
        totalMatches,
        searchPosition,
        responseKeys: data ? Object.keys(data) : [],
        acsEventKeys: data?.AcsEvent ? Object.keys(data.AcsEvent) : [],
      });

      // If there are more results, recursively pull them
      const allEvents = [...events];
      if (searchPosition + events.length < totalMatches) {
        const moreEvents = await this.pullEvents(
          device,
          startTime,
          endTime,
          searchPosition + events.length
        );
        allEvents.push(...moreEvents);
      }

      return allEvents;
    } catch (err) {
      logger.error('Hikvision pullEvents failed', {
        deviceId: device.id,
        ip: device.ipAddress,
        error: err.message,
      });
      throw err;
    }
  }

  // ========================================
  // Employee Management on Device
  // (Needed since device has no web UI)
  // ========================================

  /**
   * Add/update an employee (user) on the device
   * @param {Object} device
   * @param {Object} employeeInfo - { employeeNo, name, ... }
   */
  static async setEmployee(device, employeeInfo) {
    const client = this.createClient(device);
    const url = `${this.baseUrl(device)}/ISAPI/AccessControl/UserInfo/Record?format=json`;

    const body = {
      UserInfo: {
        employeeNo: String(employeeInfo.employeeNo),
        name: employeeInfo.name || `Employee ${employeeInfo.employeeNo}`,
        userType: 'normal',
        Valid: {
          enable: true,
          beginTime: '2020-01-01T00:00:00',
          endTime: '2037-12-31T23:59:59',
        },
        doorRight: '1',
        RightPlan: [
          {
            doorNo: 1,
            planTemplateNo: '1',
          },
        ],
        localUIRight: true,
      },
    };

    try {
      const response = await this.fetchWithTimeout(client, url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.text();
      logger.info('Hikvision setEmployee', {
        deviceId: device.id,
        employeeNo: employeeInfo.employeeNo,
        status: response.status,
      });
      return { success: response.ok, status: response.status, result };
    } catch (err) {
      logger.error('Hikvision setEmployee failed', {
        deviceId: device.id,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Enable or disable an employee on the device by setting Valid.enable.
   * Uses PUT on UserInfo/Record to update the existing record.
   * active   → Valid.enable: true   (restore access)
   * inactive → Valid.enable: false  (revoke access without deleting data/fingerprints)
   *
   * @param {Object}  device
   * @param {string}  employeeNo
   * @param {boolean} enable       - true = active, false = inactive
   * @param {string}  [name]       - optional, preserves name on device
   */
  static async setEmployeeValidity(device, employeeNo, enable, name) {
    const client = this.createClient(device);
    const url = `${this.baseUrl(device)}/ISAPI/AccessControl/UserInfo/Modify?format=json`;

    const body = {
      UserInfo: {
        employeeNo: String(employeeNo),
        name: name || `Employee ${employeeNo}`,
        userType: 'normal',
        Valid: {
          enable: !!enable,
          beginTime: '2020-01-01T00:00:00',
          endTime: '2037-12-31T23:59:59',
        },
        doorRight: enable ? '1' : '0',
        RightPlan: enable
          ? [{ doorNo: 1, planTemplateNo: '1' }]
          : [],
        localUIRight: !!enable,
      },
    };

    try {
      const response = await this.fetchWithTimeout(client, url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.text();
      logger.info('Hikvision setEmployeeValidity', {
        deviceId: device.id,
        employeeNo,
        enable,
        httpStatus: response.status,
      });
      return { success: response.ok, status: response.status, result };
    } catch (err) {
      logger.error('Hikvision setEmployeeValidity failed', {
        deviceId: device.id,
        employeeNo,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Delete an employee from the device
   */
  static async deleteEmployee(device, employeeNo) {
    const client = this.createClient(device);
    const url = `${this.baseUrl(device)}/ISAPI/AccessControl/UserInfo/Delete?format=json`;

    const body = {
      UserInfoDelCond: {
        EmployeeNoList: [{ employeeNo: String(employeeNo) }],
      },
    };

    try {
      const response = await this.fetchWithTimeout(client, url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      return { success: response.ok, status: response.status };
    } catch (err) {
      logger.error('Hikvision deleteEmployee failed', {
        deviceId: device.id,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * List all employees on the device (paginated)
   */
  static async listEmployees(device) {
    const url = `${this.baseUrl(device)}/ISAPI/AccessControl/UserInfo/Search?format=json`;

    let allEmployees = [];
    let searchResultPosition = 0;
    const pageSize = 50;
    let hasMore = true;

    try {
      while (hasMore) {
        // Create a fresh client per page — Hikvision digest auth requires a new nonce each request
        const client = this.createClient(device);

        const body = {
          UserInfoSearchCond: {
            searchID: `user_search_${Date.now()}`,
            searchResultPosition,
            maxResults: pageSize,
          },
        };

        const response = await this.fetchWithTimeout(client, url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const searchResult = data?.UserInfoSearch;
        const pageEmployees = searchResult?.UserInfo || [];
        const responseStatus = searchResult?.responseStatusStrg || '';
        const totalMatches = searchResult?.totalMatches || 0;

        if (Array.isArray(pageEmployees) && pageEmployees.length > 0) {
          allEmployees = allEmployees.concat(pageEmployees);
        }

        // Increment by actual records received (device may return fewer than maxResults)
        searchResultPosition += pageEmployees.length;

        logger.debug('Hikvision listEmployees page', {
          deviceId: device.id,
          searchResultPosition,
          pageCount: pageEmployees.length,
          totalMatches,
          responseStatus,
        });

        // Stop when:
        // - device says "NO MATCH" or "OK" (no more data)
        // - page returned 0 records (empty page = done)
        // - we've accumulated all known records (totalMatches guard)
        if (
          responseStatus === 'NO MATCH' ||
          responseStatus === 'OK' ||
          pageEmployees.length === 0 ||
          (totalMatches > 0 && allEmployees.length >= totalMatches)
        ) {
          hasMore = false;
        }
      }

      logger.info('Hikvision listEmployees complete', {
        deviceId: device.id,
        total: allEmployees.length,
      });

      return allEmployees;
    } catch (err) {
      logger.error('Hikvision listEmployees failed', {
        deviceId: device.id,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * List all fingerprints stored on the device.
   * Returns a map: { [employeeNo]: count } for quick lookup.
   *
   * Calls /ISAPI/AccessControl/FingerPrint/Search (paginated up to 1000).
   */
  static async getFingerprintCountMap(device) {
    const base = this.baseUrl(device);

    // ── Strategy 1: Use /FingerPrint/Search to get actual FP records ──
    try {
      const client1 = this.createClient(device);
      const countMap = await this._getFpCountViaSearch(client1, base, device);
      if (countMap !== null) return countMap;
    } catch (err) {
      logger.warn('Hikvision getFingerprintCountMap: FingerPrint/Search strategy failed', {
        deviceId: device.id,
        error: err.message,
      });
    }

    // ── Strategy 2: Fallback to numOfFP from UserInfo/Search ──
    try {
      const client2 = this.createClient(device);
      const countMap = await this._getFpCountViaUserInfo(client2, base, device);
      if (countMap !== null) return countMap;
    } catch (err) {
      logger.warn('Hikvision getFingerprintCountMap: UserInfo fallback also failed', {
        deviceId: device.id,
        error: err.message,
      });
    }

    // ── Strategy 3: Fallback to /FingerPrintUpload per employee ──
    // Some DS-K1T8003MF firmware only supports this endpoint for FP retrieval
    try {
      const countMap = await this._getFpCountViaUpload(base, device);
      if (countMap !== null) return countMap;
    } catch (err) {
      logger.warn('Hikvision getFingerprintCountMap: FingerPrintUpload fallback also failed', {
        deviceId: device.id,
        error: err.message,
      });
    }

    logger.error('Hikvision getFingerprintCountMap: all strategies failed', {
      deviceId: device.id,
    });
    return null;
  }

  /**
   * Get FP count via /ISAPI/AccessControl/FingerPrint/Search
   * @private
   */
  static async _getFpCountViaSearch(client, base, device) {
    const url = `${base}/ISAPI/AccessControl/FingerPrint/Search?format=json`;

    let allFpRecords = [];
    let searchResultPosition = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const body = {
        FingerPrintCond: {
          searchID: `fp_search_${Date.now()}`,
          searchResultPosition,
          maxResults: pageSize,
        },
      };

      const response = await this.fetchWithTimeout(client, url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.warn('Hikvision FingerPrint/Search returned non-OK', {
          deviceId: device.id,
          status: response.status,
          responsePreview: errorText.substring(0, 300),
        });
        return null;
      }

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        logger.warn('Hikvision FingerPrint/Search returned non-JSON', {
          deviceId: device.id,
          responsePreview: rawText.substring(0, 300),
        });
        return null;
      }

      // Log raw response structure on first page for debugging
      if (searchResultPosition === 0) {
        logger.debug('Hikvision FingerPrint/Search raw response keys', {
          deviceId: device.id,
          topKeys: Object.keys(data),
          responsePreview: JSON.stringify(data).substring(0, 500),
        });
      }

      // Handle different Hikvision response structures
      const searchResult = data?.FingerPrintSearch || data?.FingerPrintList || data;
      const fpList = searchResult?.FingerPrintInfo || searchResult?.fingerPrintInfo || [];
      const totalMatches = searchResult?.numOfMatches || searchResult?.totalMatches || 0;
      const responseStatus = searchResult?.responseStatusStrg || '';

      if (Array.isArray(fpList)) {
        allFpRecords = allFpRecords.concat(fpList);
      }

      // Check if there are more pages
      searchResultPosition += pageSize;
      if (responseStatus === 'NO MATCH' || fpList.length < pageSize || searchResultPosition >= totalMatches) {
        hasMore = false;
      }

      // Create fresh client for next page (avoid stale nonce)
      if (hasMore) {
        client = this.createClient(device);
      }
    }

    // Count fingerprints per employeeNo
    const countMap = {};
    for (const fp of allFpRecords) {
      const no = String(fp.employeeNo);
      countMap[no] = (countMap[no] || 0) + 1;
    }

    logger.info('Hikvision getFingerprintCountMap via FingerPrint/Search', {
      deviceId: device.id,
      totalRecords: allFpRecords.length,
      uniqueEmployees: Object.keys(countMap).length,
      countMap,
    });

    return countMap;
  }

  /**
   * Fallback: Get FP count from numOfFP field in UserInfo/Search response.
   * DS-K1T8003MF returns numOfFP per employee in UserInfo — more reliable on some firmware.
   * @private
   */
  static async _getFpCountViaUserInfo(client, base, device) {
    const url = `${base}/ISAPI/AccessControl/UserInfo/Search?format=json`;

    const body = {
      UserInfoSearchCond: {
        searchID: `fp_fallback_${Date.now()}`,
        searchResultPosition: 0,
        maxResults: 1000,
      },
    };

    const response = await this.fetchWithTimeout(client, url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const userList = data?.UserInfoSearch?.UserInfo || [];

    if (!userList.length) {
      return {};
    }

    // Check if this firmware actually includes numOfFP in UserInfo response
    // Some DS-K1T8003MF firmware versions do NOT return this field at all
    const sampleUser = userList[0];
    const hasNumOfFPField = sampleUser.hasOwnProperty('numOfFP') || sampleUser.hasOwnProperty('numOfFingerPrint');
    
    if (!hasNumOfFPField) {
      logger.info('Hikvision UserInfo/Search does not include numOfFP field — skipping this strategy', {
        deviceId: device.id,
        availableKeys: Object.keys(sampleUser).join(', '),
      });
      return null;
    }

    const countMap = {};
    let totalFps = 0;

    for (const user of userList) {
      const empNo = String(user.employeeNo);
      const fpCount = user.numOfFP || user.numOfFingerPrint || 0;
      if (fpCount > 0) {
        countMap[empNo] = fpCount;
        totalFps += fpCount;
      }
    }

    logger.info('Hikvision getFingerprintCountMap via UserInfo/Search (fallback)', {
      deviceId: device.id,
      totalEmployees: userList.length,
      employeesWithFP: Object.keys(countMap).length,
      totalFingerprints: totalFps,
      countMap,
    });

    return countMap;
  }

  /**
   * Fallback: Get FP count via /ISAPI/AccessControl/FingerPrintUpload per employee.
   * 
   * Some DS-K1T8003MF firmware does NOT support /FingerPrint/Search and does NOT
   * include numOfFP in UserInfo/Search. However, /FingerPrintUpload per employee
   * reliably returns fingerprint data (including fingerData base64 templates).
   * 
   * This is slower (one request per employee) but works on all tested firmware versions.
   * @private
   */
  static async _getFpCountViaUpload(base, device) {
    // First, get all employee numbers from device
    let employees;
    try {
      employees = await this.listEmployees(device);
    } catch (err) {
      logger.warn('Hikvision _getFpCountViaUpload: cannot list employees', {
        deviceId: device.id,
        error: err.message,
      });
      return null;
    }

    if (!employees || employees.length === 0) {
      return {};
    }

    const url = `${base}/ISAPI/AccessControl/FingerPrintUpload?format=json`;
    const countMap = {};
    let totalFps = 0;

    for (const emp of employees) {
      const empNo = String(emp.employeeNo);
      try {
        const client = this.createClient(device);
        const response = await this.fetchWithTimeout(client, url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            FingerPrintCond: {
              searchID: `fp_upload_${Date.now()}`,
              employeeNo: empNo,
            },
          }),
        });

        if (!response.ok) {
          // If FingerPrintUpload not supported, bail out entirely
          if (response.status === 400 || response.status === 405) {
            logger.warn('Hikvision FingerPrintUpload not supported', {
              deviceId: device.id,
              status: response.status,
            });
            return null;
          }
          continue;
        }

        const data = await response.json();
        const fpInfo = data?.FingerPrintInfo;

        if (fpInfo && fpInfo.status === 'OK') {
          const fpList = fpInfo.FingerPrintList;
          let fpCount = 0;

          if (Array.isArray(fpList)) {
            fpCount = fpList.length;
          } else if (fpList && typeof fpList === 'object') {
            // Single FP record returned as object instead of array
            fpCount = 1;
          }

          if (fpCount > 0) {
            countMap[empNo] = fpCount;
            totalFps += fpCount;
          }
        }
      } catch (err) {
        logger.debug('Hikvision FingerPrintUpload failed for employee', {
          deviceId: device.id,
          employeeNo: empNo,
          error: err.message,
        });
        // Continue to next employee
      }
    }

    logger.info('Hikvision getFingerprintCountMap via FingerPrintUpload (fallback)', {
      deviceId: device.id,
      totalEmployees: employees.length,
      employeesWithFP: Object.keys(countMap).length,
      totalFingerprints: totalFps,
      countMap,
    });

    return countMap;
  }

  /**
   * Get fingerprint details for a single employee from the device.
   * Uses /FingerPrintUpload which works on DS-K1T8003MF firmware.
   * Returns array of { fingerPrintID, fingerType, cardReaderNo } objects.
   * 
   * @param {Object} device
   * @param {string} employeeNo
   * @returns {Array} fingerprint records (without fingerData for efficiency)
   */
  static async getEmployeeFingerprints(device, employeeNo) {
    const client = this.createClient(device);
    const url = `${this.baseUrl(device)}/ISAPI/AccessControl/FingerPrintUpload?format=json`;

    try {
      const response = await this.fetchWithTimeout(client, url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          FingerPrintCond: {
            searchID: `fp_emp_${Date.now()}`,
            employeeNo: String(employeeNo),
          },
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const fpInfo = data?.FingerPrintInfo;

      if (!fpInfo || fpInfo.status !== 'OK') {
        return [];
      }

      const fpList = fpInfo.FingerPrintList;
      let records = [];

      if (Array.isArray(fpList)) {
        records = fpList;
      } else if (fpList && typeof fpList === 'object') {
        records = [fpList];
      }

      // Strip fingerData (large base64) for efficiency, keep metadata only
      return records.map(fp => ({
        fingerPrintID: fp.fingerPrintID,
        fingerType: fp.fingerType,
        cardReaderNo: fp.cardReaderNo,
      }));
    } catch (err) {
      logger.debug('Hikvision getEmployeeFingerprints failed', {
        deviceId: device.id,
        employeeNo,
        error: err.message,
      });
      return [];
    }
  }

  /**
   * Enroll a fingerprint for an employee on the device.
   *
   * DS-K1T8003MF two-step enrollment flow (verified):
   *   Step 1: POST /ISAPI/AccessControl/FingerPrint/SetUp?format=json
   *           → Configures which employee + finger slot + type
   *   Step 2: POST /ISAPI/AccessControl/CaptureFingerPrint (XML)
   *           → Triggers the physical scanner — device shows enrollment screen
   *
   * After Step 2, the user must place their finger on the scanner 3 times.
   * The device stores the fingerprint template internally.
   *
   * IMPORTANT: Any ISAPI request sent to the device while in enrollment mode
   * will cancel enrollment. The caller must set an enrollment lock to prevent
   * the sync cron job from interfering.
   *
   * @param {Object} device
   * @param {string} employeeNo
   * @param {number} fingerNo - finger index (1-10)
   * @param {string} fingerType - 'normalFP' | 'hijackFP' | 'patrolFP' | 'superFP' | 'dismissingFP'
   */
  static async startFingerprintEnroll(device, employeeNo, fingerNo = 1, fingerType = 'normalFP') {
    const client = this.createClient(device);
    const base = this.baseUrl(device);

    logger.info('Hikvision startFingerprintEnroll: starting capture+save flow', {
      deviceId: device.id,
      employeeNo,
      fingerNo,
      fingerType,
    });

    // Run the full capture→save flow in background so the API responds immediately
    this._runCaptureAndSave(device, employeeNo, fingerNo, fingerType)
      .catch((err) => {
        logger.error('Hikvision capture+save flow failed', {
          deviceId: device.id,
          error: err.message,
        });
      });

    // Return immediately — device will show capture prompt
    return {
      success: true,
      status: 200,
      result: {
        note: 'Capture sequence started. Place finger on scanner when prompted.',
      },
      step: 'complete',
    };
  }

  /**
   * Background flow: Capture fingerprint from scanner → Save to employee on device.
   *
   * DS-K1T8003MF flow:
   *   1. POST /CaptureFingerPrint → triggers scanner, returns fingerData (base64 template)
   *   2. POST /FingerPrint/SetUp  → uploads fingerData to employee's finger slot
   *
   * CaptureFingerPrint only captures the raw scan data — it does NOT persist it.
   * We must explicitly save via FingerPrint/SetUp with the fingerData.
   *
   * @param {Object} device - HikvisionDevice model instance
   * @param {string} employeeNo
   * @param {number} fingerNo
   * @param {string} fingerType
   * @private
   */
  static async _runCaptureAndSave(device, employeeNo, fingerNo, fingerType) {
    const deviceId = device.id;
    const base = this.baseUrl(device);

    // ── Step 1: Capture fingerprint (triggers scanner on device) ──
    // Create a fresh client for capture
    const captureClient = this.createClient(device);
    const captureUrl = `${base}/ISAPI/AccessControl/CaptureFingerPrint`;
    const captureXml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">' +
      `<fingerNo>${fingerNo}</fingerNo>` +
      '</CaptureFingerPrintCond>';

    logger.info('Hikvision enrollment Step 1: CaptureFingerPrint — waiting for finger scan', {
      deviceId,
      employeeNo,
      fingerNo,
    });

    let fingerData = null;

    try {
      // Wait up to 60s for the user to complete all scans on the device
      const captureResponse = await this.fetchWithTimeout(captureClient, captureUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Accept: 'application/xml',
        },
        body: captureXml,
      }, 60_000);

      const captureText = await captureResponse.text();

      // Extract fingerData (base64 template) from response
      const fingerDataMatch = captureText.match(/<fingerData>([\s\S]*?)<\/fingerData>/);
      fingerData = fingerDataMatch ? fingerDataMatch[1].trim() : null;

      const qualityMatch = captureText.match(/<fingerPrintQuality>(.*?)<\/fingerPrintQuality>/);
      const quality = qualityMatch ? qualityMatch[1] : null;

      logger.info('Hikvision enrollment Step 1 result', {
        deviceId,
        httpStatus: captureResponse.status,
        hasFingerData: !!fingerData,
        fingerDataLength: fingerData ? fingerData.length : 0,
        quality,
        responsePreview: captureText.substring(0, 300),
      });

      if (!fingerData) {
        logger.error('Hikvision enrollment: No fingerData in capture response', {
          deviceId,
          response: captureText.substring(0, 500),
        });
        return;
      }
    } catch (err) {
      logger.error('Hikvision enrollment Step 1 failed', {
        deviceId,
        error: err.message,
      });
      return;
    }

    // ── Step 2: Save fingerprint to employee on device ──
    // Create a FRESH DigestClient — the nonce from Step 1 is stale after waiting for finger scan
    const saveClient = this.createClient(device);
    const setupUrl = `${base}/ISAPI/AccessControl/FingerPrint/SetUp?format=json`;
    const setupBody = {
      FingerPrintCfg: {
        employeeNo: String(employeeNo),
        enableCardReader: [1],
        fingerPrintID: fingerNo,
        fingerType,
        fingerData,
      },
    };

    logger.info('Hikvision enrollment Step 2: Saving fingerprint via SetUp', {
      deviceId,
      employeeNo,
      fingerNo,
      fingerDataLength: fingerData.length,
    });

    try {
      const saveResponse = await this.fetchWithTimeout(saveClient, setupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(setupBody),
      }, 20_000);

      const saveText = await saveResponse.text();
      let saveResult;
      try { saveResult = JSON.parse(saveText); } catch { saveResult = { raw: saveText }; }

      logger.info('Hikvision enrollment Step 2 result', {
        deviceId,
        httpStatus: saveResponse.status,
        result: saveResult,
        success: saveResponse.ok,
      });

      if (saveResponse.ok) {
        logger.info('Hikvision enrollment COMPLETE — fingerprint saved to device', {
          deviceId,
          employeeNo,
          fingerNo,
        });
      } else {
        logger.error('Hikvision enrollment Step 2 failed — fingerprint NOT saved', {
          deviceId,
          result: saveResult,
        });
      }
    } catch (err) {
      logger.error('Hikvision enrollment Step 2 failed', {
        deviceId,
        error: err.message,
      });
    }
  }

  /**
   * Delete fingerprint(s) for an employee from the device
   *
   * @param {Object} device
   * @param {string} employeeNo
   * @param {number[]} [fingerPrintIDs] - specific finger IDs to delete (1-10), or omit to delete all
   */
  static async deleteFingerprint(device, employeeNo, fingerPrintIDs) {
    const client = this.createClient(device);
    const url = `${this.baseUrl(device)}/ISAPI/AccessControl/FingerPrint/Delete?format=json`;

    const body = {
      FingerPrintDelete: {
        mode: 'byEmployeeNo',
        EmployeeNoDetail: {
          employeeNo: String(employeeNo),
          enableCardReader: [1],
          ...(fingerPrintIDs && fingerPrintIDs.length ? { fingerPrintID: fingerPrintIDs } : {}),
        },
      },
    };

    try {
      const response = await this.fetchWithTimeout(client, url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch { result = { raw: text }; }

      logger.info('Hikvision deleteFingerprint', {
        deviceId: device.id,
        employeeNo,
        fingerPrintIDs,
        status: response.status,
      });

      return { success: response.ok, status: response.status, result };
    } catch (err) {
      logger.error('Hikvision deleteFingerprint failed', {
        deviceId: device.id,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Capture a raw fingerprint from the device scanner.
   * Someone must physically place their finger on the device while this call is active.
   * Returns the fingerprint template data (base64).
   *
   * NOTE: This is different from enrollment — capture just reads the scanner,
   * it does NOT associate the fingerprint with any employee.
   *
   * @param {Object} device
   * @param {number} fingerNo - finger index (1-10)
   */
  static async captureFingerprint(device, fingerNo = 1) {
    const client = this.createClient(device);
    const url = `${this.baseUrl(device)}/ISAPI/AccessControl/CaptureFingerPrint`;

    const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">' +
      `<fingerNo>${fingerNo}</fingerNo>` +
      '</CaptureFingerPrintCond>';

    try {
      const response = await this.fetchWithTimeout(client, url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          Accept: 'application/xml',
        },
        body: xml,
      }, 15000); // longer timeout — waiting for finger placement

      const text = await response.text();

      // Parse response XML for fingerprint data
      const fingerDataMatch = text.match(/<fingerData>(.*?)<\/fingerData>/s);
      const qualityMatch = text.match(/<fingerPrintQuality>(.*?)<\/fingerPrintQuality>/);

      return {
        success: response.ok,
        status: response.status,
        fingerData: fingerDataMatch ? fingerDataMatch[1] : null,
        fingerPrintQuality: qualityMatch ? parseInt(qualityMatch[1]) : null,
        raw: text.substring(0, 500),
      };
    } catch (err) {
      logger.error('Hikvision captureFingerprint failed', {
        deviceId: device.id,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Set device time (NTP sync alternative)
   * Since device has no web UI, time must be set via ISAPI
   */
  /**
   * Configure device to use NTP auto-sync.
   * Step 1: Set NTP server via /ISAPI/System/time/ntpServers
   * Step 2: Set timeMode to NTP via /ISAPI/System/time
   */
  static async setDeviceTime(device) {
    const client1 = this.createClient(device);
    const base = this.baseUrl(device);

    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
    const witaDate = new Date(now.getTime() + WITA_OFFSET_MS);
    const localTime =
      witaDate.getUTCFullYear() + '-' +
      pad(witaDate.getUTCMonth() + 1) + '-' +
      pad(witaDate.getUTCDate()) + 'T' +
      pad(witaDate.getUTCHours()) + ':' +
      pad(witaDate.getUTCMinutes()) + ':' +
      pad(witaDate.getUTCSeconds());

    // ── Step 1: Configure NTP server ─────────────────────────────────────────
    const ntpXml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<NTPServerList>' +
        '<NTPServer>' +
          '<id>1</id>' +
          '<addressingFormatType>hostname</addressingFormatType>' +
          '<hostName>pool.ntp.org</hostName>' +
          '<portNo>123</portNo>' +
          '<synchronizeInterval>60</synchronizeInterval>' +
        '</NTPServer>' +
      '</NTPServerList>';

    logger.info('Hikvision setDeviceTime: configuring NTP server', { deviceId: device.id });

    try {
      const ntpRes = await this.fetchWithTimeout(client1, `${base}/ISAPI/System/time/ntpServers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/xml', Accept: 'application/xml' },
        body: ntpXml,
      });
      const ntpResText = await ntpRes.text().catch(() => '');
      logger.info('Hikvision NTP server config response', {
        deviceId: device.id,
        httpStatus: ntpRes.status,
        responseBody: ntpResText.substring(0, 300),
      });
    } catch (ntpErr) {
      logger.warn('Hikvision NTP server config failed (will still attempt timeMode=NTP)', {
        deviceId: device.id,
        error: ntpErr.message,
      });
    }

    // ── Step 2: Set timeMode to NTP ──────────────────────────────────────────
    const client2 = this.createClient(device);
    const timeXml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Time>' +
        '<timeMode>NTP</timeMode>' +
        `<localTime>${localTime}</localTime>` +
        '<timeZone>CST-8:00:00</timeZone>' +
      '</Time>';

    logger.info('Hikvision setDeviceTime: setting timeMode=NTP', { deviceId: device.id, localTime });

    try {
      const response = await this.fetchWithTimeout(client2, `${base}/ISAPI/System/time`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/xml', Accept: 'application/xml' },
        body: timeXml,
      });

      const responseText = await response.text().catch(() => '');
      logger.info('Hikvision setDeviceTime response', {
        deviceId: device.id,
        httpStatus: response.status,
        responseBody: responseText.substring(0, 300),
      });

      return { success: response.ok, status: response.status, responseBody: responseText };
    } catch (err) {
      logger.error('Hikvision setDeviceTime failed', { deviceId: device.id, error: err.message });
      throw err;
    }
  }

  /**
   * Configure the device to push events to our server
   * Since device has no web UI, we configure HTTP listener via ISAPI
   *
   * @param {Object} device
   * @param {string} serverUrl - e.g. 'http://192.168.1.100:3000/api/v1/integrations/hikvision/event'
   */
  /**
   * Build XML variants for httpHosts PUT.
   * Variant A: DS-K1T8003 v2.0 exact — send BOTH entries (id=1 filled, id=2 preserved blank)
   * Variant B: DS-K v2.0 single endpoint (/httpHosts/1)
   * Variant C: DS-K no version attr — ipAddress+portNo+url=path, both entries
   * Variant D: DS-K v2.0 hostname style, both entries
   * Variant E: NVR/camera — hostName+portNo+requestURI v1.0
   */
  static _buildHttpHostsXmlVariants({ fullUrl, parsedBase, parsedPath, parsedPort, hostname, ipAddress }) {
    const ip = ipAddress || hostname;
    const listUrl = '/ISAPI/Event/notification/httpHosts';
    const singleUrl = '/ISAPI/Event/notification/httpHosts/1';
    const ns = 'http://www.isapi.org/ver20/XMLSchema';

    // ══════════════════════════════════════════════════════════════════════════
    // Variant A (PRIMARY): PUT /httpHosts/1 — single entry with XML format + userName + password
    // Confirmed working on DS-K1T8003.
    // ══════════════════════════════════════════════════════════════════════════
    const variantA = {
      endpoint: singleUrl,
      xml: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<HttpHostNotification version="2.0" xmlns="${ns}">`,
        '<id>1</id>',
        `<url>${parsedPath}</url>`,
        '<protocolType>HTTP</protocolType>',
        '<parameterFormatType>XML</parameterFormatType>',
        '<addressingFormatType>ipaddress</addressingFormatType>',
        `<ipAddress>${ip}</ipAddress>`,
        `<portNo>${parsedPort}</portNo>`,
        '<userName></userName>',
        '<password></password>',
        '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
        '</HttpHostNotification>',
      ].join('\r\n'),
    };

    // Variant B: same as A but with full list (2 entries) — for devices that require full list PUT
    const variantB = {
      endpoint: listUrl,
      xml: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<HttpHostNotificationList version="2.0" xmlns="${ns}">`,
        `<HttpHostNotification version="2.0" xmlns="${ns}">`,
        '<id>1</id>',
        `<url>${parsedPath}</url>`,
        '<protocolType>HTTP</protocolType>',
        '<parameterFormatType>XML</parameterFormatType>',
        '<addressingFormatType>ipaddress</addressingFormatType>',
        `<ipAddress>${ip}</ipAddress>`,
        `<portNo>${parsedPort}</portNo>`,
        '<userName></userName>',
        '<password></password>',
        '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
        '</HttpHostNotification>',
        `<HttpHostNotification version="2.0" xmlns="${ns}">`,
        '<id>2</id>',
        '<url></url>',
        '<protocolType></protocolType>',
        '<parameterFormatType></parameterFormatType>',
        '<addressingFormatType></addressingFormatType>',
        '<portNo>0</portNo>',
        '<userName></userName>',
        '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
        '<SubscribeEvent>',
        '<eventMode>all</eventMode>',
        '</SubscribeEvent>',
        '</HttpHostNotification>',
        '</HttpHostNotificationList>',
      ].join('\r\n'),
    };

    // Variant C: JSON format single entry (for NVR/newer cameras)
    const variantC = {
      endpoint: singleUrl,
      xml: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<HttpHostNotification version="2.0" xmlns="${ns}">`,
        '<id>1</id>',
        `<url>${parsedPath}</url>`,
        '<protocolType>HTTP</protocolType>',
        '<parameterFormatType>JSON</parameterFormatType>',
        '<addressingFormatType>ipaddress</addressingFormatType>',
        `<ipAddress>${ip}</ipAddress>`,
        `<portNo>${parsedPort}</portNo>`,
        '<userName></userName>',
        '<password></password>',
        '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
        '</HttpHostNotification>',
      ].join('\r\n'),
    };

    // Variant D: JSON format full list (2 entries)
    const variantD = {
      endpoint: listUrl,
      xml: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<HttpHostNotificationList version="2.0" xmlns="${ns}">`,
        `<HttpHostNotification version="2.0" xmlns="${ns}">`,
        '<id>1</id>',
        `<url>${parsedPath}</url>`,
        '<protocolType>HTTP</protocolType>',
        '<parameterFormatType>JSON</parameterFormatType>',
        '<addressingFormatType>ipaddress</addressingFormatType>',
        `<ipAddress>${ip}</ipAddress>`,
        `<portNo>${parsedPort}</portNo>`,
        '<userName></userName>',
        '<password></password>',
        '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
        '</HttpHostNotification>',
        `<HttpHostNotification version="2.0" xmlns="${ns}">`,
        '<id>2</id>',
        '<url></url>',
        '<protocolType></protocolType>',
        '<parameterFormatType></parameterFormatType>',
        '<addressingFormatType></addressingFormatType>',
        '<portNo>0</portNo>',
        '<userName></userName>',
        '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
        '<SubscribeEvent>',
        '<eventMode>all</eventMode>',
        '</SubscribeEvent>',
        '</HttpHostNotification>',
        '</HttpHostNotificationList>',
      ].join('\r\n'),
    };

    // Variant E: NVR/camera style v1.0 — hostName+portNo+requestURI
    const variantE = {
      endpoint: listUrl,
      xml: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<HttpHostNotificationList version="1.0" xmlns="${ns}">`,
        '<HttpHostNotification>',
        '<id>1</id>',
        `<url>${parsedBase}</url>`,
        '<protocolType>HTTP</protocolType>',
        '<parameterFormatType>JSON</parameterFormatType>',
        '<addressingFormatType>hostname</addressingFormatType>',
        `<hostName>${hostname}</hostName>`,
        `<portNo>${parsedPort}</portNo>`,
        `<requestURI>${parsedPath}</requestURI>`,
        '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
        '</HttpHostNotification>',
        '</HttpHostNotificationList>',
      ].join('\r\n'),
    };

    return [variantA, variantB, variantC, variantD, variantE];
  }

  static async configureEventPush(device, serverUrl) {
    const client = this.createClient(device);
    const baseDeviceUrl = this.baseUrl(device);

    let fullUrl = serverUrl;
    let parsedBase = serverUrl;
    let parsedPath = '/';
    let parsedPort = 80;
    let hostname = '127.0.0.1';
    let ipAddress = '127.0.0.1';
    try {
      const u = new URL(serverUrl);
      parsedBase = `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`;
      parsedPath = u.pathname + (u.search || '');
      parsedPort = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
      hostname = u.hostname;
      // Detect if hostname is an IP address
      ipAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname) ? u.hostname : u.hostname;
      fullUrl = serverUrl;
    } catch {
      // serverUrl may already be a base — keep as-is
    }

    logger.info('Hikvision configureEventPush — setting HTTP host', {
      deviceId: device.id,
      serverUrl,
      parsedBase,
      parsedPath,
      parsedPort,
    });

    /**
     * Helper: attempt PUT to given path with given content-type and body.
     * Returns { ok, status, text }
     */
    const attemptPut = async (endpointPath, contentType, body) => {
      const resp = await this.fetchWithTimeout(client, `${baseDeviceUrl}${endpointPath}`, {
        method: 'PUT',
        headers: { 'Content-Type': contentType, Accept: 'application/json, text/xml' },
        body,
      });
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, text };
    };

    // Step 0: GET current config to see raw structure (helps debug)
    let rawDeviceConfig = null;
    try {
      const getResp = await this.fetchWithTimeout(client, `${baseDeviceUrl}/ISAPI/Event/notification/httpHosts`, {
        method: 'GET',
        headers: { Accept: 'application/json, text/xml, */*' },
      });
      rawDeviceConfig = await getResp.text();
      logger.info('Hikvision configureEventPush — current device config (GET)', {
        deviceId: device.id,
        status: getResp.status,
        raw: rawDeviceConfig.substring(0, 500),
      });
    } catch (getErr) {
      logger.warn('Hikvision configureEventPush — GET current config failed', {
        deviceId: device.id,
        error: getErr.message,
      });
    }

    // JSON body (last resort for NVR/cameras that support JSON)
    const jsonBody = JSON.stringify({
      HttpHostNotificationList: [{
        id: '1',
        url: fullUrl,
        hostName: hostname,
        portNo: parsedPort,
        requestURI: parsedPath,
        protocolType: 'HTTP',
        parameterFormatType: 'JSON',
        httpAuthenticationMethod: 'none',
      }],
    });

    // XML variants — tried in order until one succeeds
    // Variant A is the primary (confirmed working on DS-K1T8003: single endpoint + XML format + userName/password)
    const xmlVariants = this._buildHttpHostsXmlVariants({ fullUrl, parsedBase, parsedPath, parsedPort, hostname, ipAddress });

    try {
      let result;
      let usedVariant;

      // Step 1: Try XML variants in order (A=single+XML is tried first — proven on DS-K1T8003)
      for (let i = 0; i < xmlVariants.length; i++) {
        const { endpoint, xml, contentType: variantCt } = xmlVariants[i];
        const xmlResult = await attemptPut(endpoint, variantCt || 'application/xml', xml);
        const variantLabel = String.fromCharCode(65 + i); // A, B, C...
        logger.info(`Hikvision configureEventPush — XML variant ${variantLabel} (${endpoint}) response`, {
          deviceId: device.id,
          ok: xmlResult.ok,
          status: xmlResult.status,
          snippet: xmlResult.text.substring(0, 200),
        });
        if (xmlResult.ok) {
          result = xmlResult;
          usedVariant = `xml-variant-${variantLabel}`;
          break;
        }
        result = xmlResult; // keep last error
      }

      // Step 2: All XML failed → try JSON as last resort
      if (!result || !result.ok) {
        logger.info('Hikvision configureEventPush — all XML failed, trying JSON', {
          deviceId: device.id,
        });
        const jsonResult = await attemptPut('/ISAPI/Event/notification/httpHosts', 'application/json', jsonBody);
        if (jsonResult.ok) {
          result = jsonResult;
          usedVariant = 'json';
        } else if (!result) {
          result = jsonResult;
          usedVariant = 'json';
        }
      }

      logger.info('Hikvision configureEventPush — final result', {
        deviceId: device.id,
        ok: result.ok,
        status: result.status,
        usedVariant,
      });

      if (!result.ok) {
        logger.error('Hikvision configureEventPush — all attempts failed', {
          deviceId: device.id,
          status: result.status,
          body: result.text.substring(0, 300),
        });
        return { success: false, status: result.status, error: result.text, rawDeviceConfig };
      }

      // Step 3: enable event notification triggers (non-fatal)
      try {
        const triggerUrl = `${baseDeviceUrl}/ISAPI/Event/notification/httpHosts/1/eventTypes`;
        const triggerXml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<EventTriggerList version="1.0" xmlns="http://www.isapi.org/ver20/XMLSchema">',
          '<EventTrigger>',
          '<eventType>AccessControllerEvent</eventType>',
          '<eventDescription>Access Controller Event</eventDescription>',
          '<notificationList>',
          '<notification>',
          '<notificationMethod>HTTP</notificationMethod>',
          '<httpHostID>1</httpHostID>',
          '</notification>',
          '</notificationList>',
          '</EventTrigger>',
          '</EventTriggerList>',
        ].join('\n');

        const triggerJsonBody = JSON.stringify({ eventTypes: ['AccessControllerEvent'] });
        const triggerResult = await this.fetchWithTimeout(client, triggerUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/xml' },
          body: triggerJsonBody,
        }, 5000).then(r => r.text().then(t => ({ ok: r.ok, text: t }))).catch(() => null);

        if (triggerResult && !triggerResult.ok) {
          await this.fetchWithTimeout(client, triggerUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/xml', Accept: 'application/json, text/xml' },
            body: triggerXml,
          }, 5000).catch(() => null);
        }

        logger.info('Hikvision configureEventPush — event triggers set', { deviceId: device.id });
      } catch (triggerErr) {
        logger.warn('Hikvision configureEventPush — event trigger set skipped (firmware may not support)', {
          deviceId: device.id,
          error: triggerErr.message,
        });
      }

      return { success: true, status: result.status, parsedBase, parsedPath, usedVariant, rawDeviceConfig };
    } catch (err) {
      logger.error('Hikvision configureEventPush failed', {
        deviceId: device.id,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Get current event push configuration from device
   *
   * @param {Object} device
   * @returns {Object} { success, pushUrl, protocolType, enabled }
   */
  static async getEventPushConfig(device) {
    const client = this.createClient(device);
    const url = `${this.baseUrl(device)}/ISAPI/Event/notification/httpHosts`;

    try {
      const response = await this.fetchWithTimeout(client, url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        logger.warn('Hikvision getEventPushConfig — device returned non-OK', {
          deviceId: device.id,
          status: response.status,
          body: errText.substring(0, 300),
        });
        return { success: false, pushUrl: null, enabled: false, error: `HTTP ${response.status}`, rawResponse: errText.substring(0, 300) };
      }

      const rawText = await response.text();
      let activeHost = null;

      // Try JSON first
      try {
        const data = JSON.parse(rawText);
        const hosts = data?.HttpHostNotificationList || data?.HttpHostNotification || [];
        const list = Array.isArray(hosts) ? hosts : [hosts];
        activeHost = list.find(h => h && (h.url || h.hostName || h.ipAddress)) || null;
      } catch {
        // Device returned XML — parse entry id=1 specifically
        logger.info('Hikvision getEventPushConfig — JSON parse failed, trying XML', { deviceId: device.id });

        // Extract first HttpHostNotification block (entry id=1)
        const entry1Match = rawText.match(/<HttpHostNotification[^>]*>[\s\S]*?<id>1<\/id>[\s\S]*?<\/HttpHostNotification>/);
        const entry1Xml = entry1Match ? entry1Match[0] : rawText;

        const extractXml = (tag, src) => {
          const m = (src || entry1Xml).match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
          return m ? m[1].trim() : null;
        };
        const xmlUrl = extractXml('url');
        const xmlHostName = extractXml('hostName');
        const xmlIpAddress = extractXml('ipAddress');
        const xmlPortNo = extractXml('portNo');
        const xmlRequestURI = extractXml('requestURI');
        const xmlProtocol = extractXml('protocolType');

        // DS-K1T8003 stores config as ipAddress+portNo, url may be empty, protocol may show EHome
        if (xmlUrl || xmlHostName || xmlIpAddress) {
          activeHost = {
            url: xmlUrl || null,
            hostName: xmlHostName || null,
            ipAddress: xmlIpAddress || null,
            portNo: xmlPortNo ? parseInt(xmlPortNo, 10) : null,
            requestURI: xmlRequestURI || null,
            protocolType: xmlProtocol || null,
          };
        }
      }

      // Reconstruct full URL from parts if needed
      let pushUrl = activeHost?.url || null;
      if (!pushUrl && activeHost?.hostName) {
        const port = activeHost.portNo ? `:${activeHost.portNo}` : '';
        const path = activeHost.requestURI || '/';
        pushUrl = `${activeHost.hostName}${port}${path}`;
      } else if (!pushUrl && activeHost?.ipAddress) {
        // DS-K1T8003 style: ipAddress + portNo, url may be empty
        const port = activeHost.portNo ? `:${activeHost.portNo}` : '';
        const path = activeHost.requestURI || '';
        pushUrl = `http://${activeHost.ipAddress}${port}${path}`;
      } else if (pushUrl && activeHost?.requestURI && !pushUrl.includes(activeHost.requestURI)) {
        // url is just the base — append path
        pushUrl = pushUrl.replace(/\/$/, '') + activeHost.requestURI;
      }

      // Device is configured if ipAddress+portNo are set, even if url is empty (DS-K1T8003 behavior)
      const isConfigured = !!(pushUrl && pushUrl.length > 1) ||
        !!(activeHost?.ipAddress && activeHost?.portNo && activeHost.portNo > 0);

      logger.info('Hikvision getEventPushConfig — parsed result', {
        deviceId: device.id,
        pushUrl,
        isConfigured,
        activeHost,
        rawSnippet: rawText.substring(0, 200),
      });

      return {
        success: true,
        pushUrl,
        protocolType: activeHost?.protocolType || null,
        enabled: isConfigured,
        ipAddress: activeHost?.ipAddress || null,
        portNo: activeHost?.portNo || null,
        rawResponse: rawText.substring(0, 500),
      };
    } catch (err) {
      logger.error('Hikvision getEventPushConfig failed', {
        deviceId: device.id,
        error: err.message,
      });
      return { success: false, pushUrl: null, enabled: false, error: err.message };
    }
  }

  /**
   * Disable event push on device (clear HTTP hosts)
   *
   * @param {Object} device
   * @returns {Object} { success }
   */
  static async disableEventPush(device) {
    const client = this.createClient(device);
    const baseUrl = this.baseUrl(device);
    const ns = 'http://www.isapi.org/ver20/XMLSchema';

    // Primary: single-entry PUT to /httpHosts/1 with XML format (proven on DS-K1T8003)
    const singleXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>1</id>',
      '<url></url>',
      '<protocolType>HTTP</protocolType>',
      '<parameterFormatType>XML</parameterFormatType>',
      '<addressingFormatType>ipaddress</addressingFormatType>',
      '<ipAddress></ipAddress>',
      '<portNo>0</portNo>',
      '<userName></userName>',
      '<password></password>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '</HttpHostNotification>',
    ].join('\r\n');

    // Fallback: list PUT
    const listXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<HttpHostNotificationList version="1.0" xmlns="http://www.isapi.org/ver20/XMLSchema">',
      '  <HttpHostNotification>',
      '    <id>1</id>',
      '    <url></url>',
      '    <protocolType>HTTP</protocolType>',
      '    <parameterFormatType>JSON</parameterFormatType>',
      '    <addressingFormatType>hostname</addressingFormatType>',
      '    <hostName></hostName>',
      '    <portNo>80</portNo>',
      '    <requestURI>/</requestURI>',
      '    <httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '  </HttpHostNotification>',
      '</HttpHostNotificationList>',
    ].join('\n');

    const jsonBody = JSON.stringify({
      HttpHostNotificationList: [{
        id: '1',
        url: '',
        protocolType: 'HTTP',
        parameterFormatType: 'JSON',
        requestURI: '',
        httpAuthenticationMethod: 'none',
      }],
    });

    try {
      // Try single-entry XML first (DS-K1T8003)
      let response = await this.fetchWithTimeout(client, `${baseUrl}/ISAPI/Event/notification/httpHosts/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/xml', Accept: 'application/json, text/xml' },
        body: singleXml,
      });
      let responseText = await response.text();

      // Fallback to list XML
      if (!response.ok) {
        logger.info('Hikvision disableEventPush — single XML failed, trying list XML', { deviceId: device.id });
        response = await this.fetchWithTimeout(client, `${baseUrl}/ISAPI/Event/notification/httpHosts`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/xml', Accept: 'application/json, text/xml' },
          body: listXml,
        });
        responseText = await response.text();
      }

      // Fallback to JSON
      if (!response.ok) {
        logger.info('Hikvision disableEventPush — retrying with JSON', { deviceId: device.id });
        response = await this.fetchWithTimeout(client, `${baseUrl}/ISAPI/Event/notification/httpHosts`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/xml' },
          body: jsonBody,
        });
        responseText = await response.text();
      }

      logger.info('Hikvision disableEventPush', {
        deviceId: device.id,
        status: response.status,
        ok: response.ok,
      });

      return { success: response.ok };
    } catch (err) {
      logger.error('Hikvision disableEventPush failed', {
        deviceId: device.id,
        error: err.message,
      });
      throw err;
    }
  }

  // ========================================
  // Enrollment Lock
  // ========================================

  /**
   * Lock a device for fingerprint enrollment.
   * While locked, the sync cron job will skip this device.
   * Lock auto-expires after `ttlMs` (default 2 minutes).
   */
  static lockForEnrollment(deviceId, employeeNo, ttlMs = 120_000) {
    const now = new Date();
    _enrollmentLocks.set(deviceId, {
      lockedAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      employeeNo,
    });
    logger.info('Hikvision enrollment lock SET', { deviceId, employeeNo, ttlMs });
  }

  /**
   * Unlock a device after enrollment completes or is cancelled.
   */
  static unlockEnrollment(deviceId) {
    _enrollmentLocks.delete(deviceId);
    logger.info('Hikvision enrollment lock RELEASED', { deviceId });
  }

  /**
   * Check if a device is currently locked for enrollment.
   * Also cleans up expired locks.
   */
  static isEnrollmentLocked(deviceId) {
    const lock = _enrollmentLocks.get(deviceId);
    if (!lock) return false;

    // Auto-expire
    if (new Date() > lock.expiresAt) {
      _enrollmentLocks.delete(deviceId);
      logger.info('Hikvision enrollment lock EXPIRED', { deviceId });
      return false;
    }

    return true;
  }

  /**
   * Get enrollment lock info for a device.
   */
  static getEnrollmentLock(deviceId) {
    if (!this.isEnrollmentLocked(deviceId)) return null;
    return _enrollmentLocks.get(deviceId);
  }

  // ========================================
  // Helpers
  // ========================================

  /**
   * Format a Date to Hikvision ISAPI compatible ISO string
   * e.g. "2026-02-19T08:30:00+07:00"
   */
  static formatISO(date) {
    const d = new Date(date);
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const minutes = String(Math.abs(offset) % 60).padStart(2, '0');

    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0') +
      'T' +
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0') +
      ':' +
      String(d.getSeconds()).padStart(2, '0') +
      sign +
      hours +
      ':' +
      minutes
    );
  }

  /**
   * Normalize event data from Hikvision format to our internal format.
   * Handles both pull format (AcsEvent) and push format (AccessControllerEvent).
   */
  static normalizeEvent(rawEvent) {
    // Push format uses majorEventType/subEventType, pull format uses major/minor
    const major = rawEvent.major ?? rawEvent.majorEventType;
    const minor = rawEvent.minor ?? rawEvent.subEventType;

    // Determine verify mode from major/minor codes if not directly available
    let verifyMode = rawEvent.currentVerifyMode || rawEvent.verifyMode || rawEvent.attendenceStatus || null;
    if (!verifyMode && major === 5) {
      // major=5 is access event; minor indicates verify method
      const minorMap = {
        1: 'card',        // card swipe
        38: 'fingerprint', // fingerprint
        39: 'fingerprint', // fingerprint + password
        75: 'face',        // face recognition
        76: 'face',        // face + card
      };
      verifyMode = minorMap[minor] || 'unknown';
    }

    return {
      deviceEmployeeNo: rawEvent.employeeNoString || rawEvent.employeeNo?.toString() || '',
      eventTime: rawEvent.time || rawEvent.dateTime || null,
      cardNo: rawEvent.cardNo || null,
      verifyMode,
      major,
      minor,
    };
  }
}

module.exports = HikvisionService;
