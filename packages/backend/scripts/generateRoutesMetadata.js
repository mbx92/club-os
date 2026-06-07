const fs = require('fs');
const path = require('path');
// Comment out logger for now to avoid dependency issues
// const logger = require('../src/utils/logger');

/**
 * This script automatically generates routes metadata from route files
 * It scans route files and extracts metadata to create a comprehensive routes metadata object
 */

// Base directory for routes
const routesDir = path.join(__dirname, '../src/routes');
// Main index file for routes mounting
const routesIndexFile = path.join(routesDir, 'index.js');
// Output file for routes metadata
const outputFile = path.join(__dirname, '../src/utils/routesMetadata.js');

// Default permissions for different HTTP methods
const defaultMethodPermissions = {
  'GET': { actions: ['read'] },
  'POST': { actions: ['create'] },
  'PUT': { actions: ['update'] },
  'DELETE': { actions: ['delete'] },
  'PATCH': { actions: ['update'] }
};

// Default resource names based on route patterns
const resourceMapping = {
  'auth': 'Auth',
  'users': 'User',
  'tenants': 'Tenant',
  'members': 'Member',
  'memberships': 'Membership',
  'membership-types': 'MembershipType',
  'payments': 'Payment',
  'check-ins': 'CheckIn',
  'permissions': 'Permission'
};

// Default roles for different route patterns
const defaultRoles = {
  'auth': ['public'],
  'users': ['admin', 'manager'],
  'tenants': ['admin'],
  'members': ['admin', 'manager', 'staff'],
  'memberships': ['admin', 'manager', 'staff'],
  'membership-types': ['admin', 'manager'],
  'payments': ['admin', 'manager'],
  'check-ins': ['admin', 'manager', 'staff'],
  'permissions': ['admin', 'manager', 'staff', 'member']
};

/**
 * Extract routes from a route file content
 * @param {string} content - The content of route file
 * @param {string} fileName - The name of route file
 * @param {string} filePath - Full path of route file
 * @returns {Array} - Array of route objects
 */
function extractRoutesFromContent(content, fileName, filePath = '') {
  const routes = [];
  
  // Extract route base path from filename or content
  let routeNameFromFileName = fileName.replace('.routes.js', '').replace('Routes.js', '').toLowerCase();
  
  // Try to extract base path from file path structure
  let basePath = '';
  if (filePath) {
    const routesIndex = filePath.indexOf('routes');
    if (routesIndex !== -1) {
      const afterRoutes = filePath.substring(routesIndex + 6); // 'routes' = 6 chars
      const parts = afterRoutes.split(path.sep).filter(p => p && p !== fileName);
      if (parts.length > 0) {
        basePath = '/' + parts.join('/');
      }
    }
  }
  
  // If no basePath found from file structure, try to extract from content
  if (!basePath) {
    const routerUseRegex = /router\.use\(['"`]([^'"`]+)['"`]/;
    const match = content.match(routerUseRegex);
    if (match && match[1]) {
      basePath = match[1];
    }
  }
  
  // If still no basePath, use filename
  if (!basePath) {
    basePath = '/' + routeNameFromFileName;
  }
  
  // Make sure basePath starts with /
  if (!basePath.startsWith('/')) {
    basePath = '/' + basePath;
  }
  
  // Extract routes with their methods
  const routerMethodRegex = /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
  
  let match;
  while ((match = routerMethodRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    
    // Build full path
    let fullPath = basePath;
    if (routePath && routePath !== '/') {
      fullPath = basePath + (routePath.startsWith('/') ? routePath : '/' + routePath);
    }
    
    // Clean up double slashes
    fullPath = fullPath.replace(/\/+/g, '/');
    
    // Extract route name from comments or use a generated name
    const routeName = extractRouteName(content, fullPath, method, routeNameFromFileName);
    
    // Extract description from comments
    const description = extractDescription(content, fullPath, method);
    
    // Generate permissions based on route pattern
    const permissions = generatePermissions(fullPath, method, routeNameFromFileName);
    
    routes.push({
      name: routeName,
      path: fullPath,
      method,
      description,
      permissions
    });
  }
  
  return routes;
}

/**
 * Extract route name from comments or generate one
 * @param {string} content - The content of route file
 * @param {string} path - The route path
 * @param {string} method - The HTTP method
 * @param {string} routeNameFromFileName - The route name derived from filename
 * @returns {string} - The route name
 */
function extractRouteName(content, path, method, routeNameFromFileName) {
  // Try to find a comment that matches route
  const commentRegex = new RegExp(`\\/\\/\\s*@route\\s+${method}\\s+${path.replace(/[\/\{\}]/g, '\\$&')}[^\\n]*\\n\\s*\\/\\/\\s*@name\\s+([^\\n]+)`, 'i');
  const match = content.match(commentRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Generate a name based on path and method
  const pathParts = path.split('/').filter(part => part.length > 0);
  const resource = routeNameFromFileName || pathParts[0] || 'root';
  const action = method.toLowerCase();
  const idParam = pathParts.length > 1 && pathParts[1].startsWith(':') ? 'ById' : '';
  
  return `${resource}.${action}${idParam}`;
}

/**
 * Extract description from comments
 * @param {string} content - The content of route file
 * @param {string} path - The route path
 * @param {string} method - The HTTP method
 * @returns {string} - The description
 */
function extractDescription(content, path, method) {
  // Try to find a comment that matches route
  const commentRegex = new RegExp(`\\/\\/\\s*@route\\s+${method}\\s+${path.replace(/[\/\{\}]/g, '\\$&')}[^\\n]*\\n\\s*\\/\\/\\s*@desc\\s+([^\\n]+)`, 'i');
  const match = content.match(commentRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Generate a default description
  const pathParts = path.split('/').filter(part => part.length > 0);
  const resource = pathParts[0] || 'root';
  const action = getActionName(method);
  const idParam = pathParts.length > 1 && pathParts[1].startsWith(':') ? ' by ID' : '';
  
  return `${action} ${resource}${idParam}`;
}

/**
 * Get action name based on HTTP method
 * @param {string} method - The HTTP method
 * @returns {string} - The action name
 */
function getActionName(method) {
  const actionNames = {
    'GET': 'Get',
    'POST': 'Create',
    'PUT': 'Update',
    'DELETE': 'Delete',
    'PATCH': 'Update'
  };
  
  return actionNames[method] || method;
}

/**
 * Generate permissions based on route path and method
 * @param {string} path - The route path
 * @param {string} method - The HTTP method
 * @param {string} routeNameFromFileName - The route name derived from filename
 * @returns {Object} - The permissions object
 */
function generatePermissions(path, method, routeNameFromFileName) {
  const pathParts = path.split('/').filter(part => part.length > 0);
  const resource = routeNameFromFileName || pathParts[0] || 'root';
  
  // Get default permissions for this method
  const methodPermissions = defaultMethodPermissions[method] || { actions: [] };
  
  // Get resource name
  const resourceName = resourceMapping[resource] || 'Resource';
  
  // Get default roles for this resource
  const roles = defaultRoles[resource] || ['admin'];
  
  return {
    roles,
    actions: methodPermissions.actions,
    resource: resourceName
  };
}

/**
 * Scan all route files recursively and extract routes
 * @param {string} dir - Directory to scan
 * @param {Array} fileList - Accumulated list of files
 * @returns {Array} - Array of route file paths
 */
function getAllRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      getAllRouteFiles(filePath, fileList);
    } else if (file.endsWith('.routes.js') || file.endsWith('Routes.js')) {
      // Skip index.js files
      if (file !== 'index.js') {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * Scan all route files and extract routes
 * @returns {Object} - Routes metadata object
 */
function scanRouteFiles() {
  const routesMetadata = {};
  
  try {
    // Get all route files recursively
    const routeFiles = getAllRouteFiles(routesDir);
    
    console.log(`Found ${routeFiles.length} route files`);
    
    // Process each route file
    for (const filePath of routeFiles) {
      const fileName = path.basename(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      
      const routes = extractRoutesFromContent(content, fileName, filePath);
      
      console.log(`  - ${fileName}: ${routes.length} routes`);
      
      // Add routes to metadata
      for (const route of routes) {
        routesMetadata[route.name] = {
          path: route.path,
          method: route.method,
          description: route.description,
          permissions: route.permissions
        };
      }
    }
    
    console.log(`\nGenerated routes metadata from ${routeFiles.length} files`, {
      routesCount: Object.keys(routesMetadata).length
    });
    
    return routesMetadata;
  } catch (error) {
    console.error('Error scanning route files', {
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}

/**
 * Generate routes metadata file
 */
function generateRoutesMetadataFile() {
  try {
    const routesMetadata = scanRouteFiles();
    
    // Generate file content
    const fileContent = `/**
 * Routes Metadata
 * This file contains metadata for all routes in application
 * It is automatically generated by scripts/generateRoutesMetadata.js
 * 
 * To update this file, run: node scripts/generateRoutesMetadata.js
 * 
 * For custom permissions or descriptions, you can edit this file directly
 * or add JSDoc comments to your route files:
 * 
 * @route GET /users
 * @name users.list
 * @desc Get all users
 */

const routesMetadata = ${JSON.stringify(routesMetadata, null, 2)};

module.exports = routesMetadata;
`;
    
    // Write to file
    fs.writeFileSync(outputFile, fileContent);
    
    console.log('Routes metadata file generated successfully', {
      outputFile,
      routesCount: Object.keys(routesMetadata).length
    });
    
    console.log(`✅ Routes metadata generated successfully with ${Object.keys(routesMetadata).length} routes`);
    console.log(`📁 Output file: ${outputFile}`);
    
  } catch (error) {
    console.error('Error generating routes metadata file', {
      error: error.message,
      stack: error.stack
    });
    
    console.error('❌ Error generating routes metadata:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  generateRoutesMetadataFile();
}

module.exports = {
  generateRoutesMetadataFile,
  scanRouteFiles,
  extractRoutesFromContent,
  getAllRouteFiles
};