const fs = require('fs');
const path = require('path');

/**
 * Enhanced Routes Metadata Generator with Auto-Detection of Mount Paths
 * This version parses index.js files to automatically detect route mounting paths
 */

const routesDir = path.join(__dirname, '../src/routes');
const routesIndexFile = path.join(routesDir, 'index.js');
const outputFile = path.join(__dirname, '../src/utils/routesMetadata.js');

/**
 * Parse main index.js to extract route mountings
 */
function parseMainIndexMountings() {
  const mountingMap = {};
  
  try {
    const content = fs.readFileSync(routesIndexFile, 'utf8');
    
    // Extract router.use statements: router.use('/path', variable)
    const routerUseRegex = /router\.use\(['"`]([^'"`]+)['"`],\s*(\w+)\)/g;
    
    let match;
    while ((match = routerUseRegex.exec(content)) !== null) {
      const mountPath = match[1];
      const routeVariable = match[2];
      mountingMap[routeVariable] = mountPath;
    }
    
    console.log(`✓ Found ${Object.keys(mountingMap).length} route mountings in main index.js`);
    
    return mountingMap;
  } catch (error) {
    console.error('Error parsing main index.js:', error.message);
    return {};
  }
}

/**
 * Recursively find all route files
 */
function getAllRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllRouteFiles(filePath, fileList);
    } else if ((file.endsWith('.routes.js') || file.endsWith('Routes.js')) && file !== 'index.js') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Determine mount path for a route file by tracing its export chain
 */
function determineMountPath(filePath, mainMountings) {
  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);
  const mainIndexContent = fs.readFileSync(routesIndexFile, 'utf8');
  
  // Step 1: Find immediate parent index.js export name
  const parentIndexPath = path.join(fileDir, 'index.js');
  let exportName = null;
  
  if (fs.existsSync(parentIndexPath)) {
    const parentContent = fs.readFileSync(parentIndexPath, 'utf8');
    
    // Find where this file is required
    // Pattern: const varName = require('./fileName')
    const baseFileName = fileName.replace('.routes.js', '').replace('Routes.js', '');
    const requireRegex = new RegExp(`(\\w+)\\s*=\\s*require\\(['"]\\.\\/(?:\\w+\\/)?` + baseFileName + `(?:\\.routes)?['"]\\)`);
    const match = parentContent.match(requireRegex);
    
    if (match) {
      exportName = match[1];
      
      // Step 2: Check if this export is directly mounted in main index
      if (mainMountings[exportName]) {
        return mainMountings[exportName];
      }
      
      // Step 3: Check if parent group is imported in main index with destructuring
      // Pattern: const { exportName, ... } = require('./path')
      const relativePath = path.relative(routesDir, fileDir);
      const requirePath = './' + relativePath.split(path.sep).join('/');
      
      // Escape special regex characters
      const escapedPath = requirePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const destructureRegex = new RegExp(`\\{[^}]*\\b${exportName}\\b[^}]*\\}\\s*=\\s*require\\(['"]${escapedPath}['"]\\)`);
      
      if (destructureRegex.test(mainIndexContent)) {
        // exportName is imported via destructuring in main index
        // and should be in mainMountings
        if (mainMountings[exportName]) {
          return mainMountings[exportName];
        }
      }
      
      // Step 4: Check nested re-exports (for multi-level module groups)
      const grandParentDir = path.dirname(fileDir);
      const grandParentIndexPath = path.join(grandParentDir, 'index.js');
      
      if (fs.existsSync(grandParentIndexPath)) {
        const grandParentContent = fs.readFileSync(grandParentIndexPath, 'utf8');
        const parentDirName = path.basename(fileDir);
        
        // Check if grandparent imports from parent and re-exports
        const reExportRegex = new RegExp(`\\{[^}]*\\b${exportName}\\b[^}]*\\}\\s*=\\s*require\\(['"]\\.\\/` + parentDirName);
        
        if (reExportRegex.test(grandParentContent)) {
          // Check if grandparent's export is in main index
          const grandParentRelativePath = path.relative(routesDir, grandParentDir);
          const grandParentRequirePath = './' + grandParentRelativePath.split(path.sep).join('/');
          const escapedGrandPath = grandParentRequirePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const grandDestructureRegex = new RegExp(`\\{[^}]*\\b${exportName}\\b[^}]*\\}\\s*=\\s*require\\(['"]${escapedGrandPath}['"]\\)`);
          
          if (grandDestructureRegex.test(mainIndexContent) && mainMountings[exportName]) {
            return mainMountings[exportName];
          }
        }
      }
    }
  } else {
    // No parent index - file might be directly required from main
    const baseFileName = fileName.replace('.routes.js', '').replace('Routes.js', '');
    
    // Check main index direct requires
    const directRequireRegex = new RegExp(`(\\w+)\\s*=\\s*require\\(['"]\\.\\/` + baseFileName + `(?:\\.routes)?['"]\\)`);
    const match = mainIndexContent.match(directRequireRegex);
    
    if (match && mainMountings[match[1]]) {
      return mainMountings[match[1]];
    }
  }
  
  // Fallback: fuzzy match variable names in main mountings
  const baseFileName = fileName.replace('.routes.js', '').replace('Routes.js', '').toLowerCase();
  
  for (const [varName, mountPath] of Object.entries(mainMountings)) {
    const cleanVarName = varName.toLowerCase().replace('routes', '').replace('router', '');
    
    // Exact match or plural variation
    if (cleanVarName === baseFileName ||
        cleanVarName === baseFileName + 's' ||
        cleanVarName + 's' === baseFileName) {
      return mountPath;
    }
  }
  
  // Final fallback: use directory structure
  const relativePath = path.relative(routesDir, fileDir);
  if (relativePath) {
    return '/' + relativePath.split(path.sep).join('/') + '/' + baseFileName;
  }
  
  return '/' + baseFileName;
}

/**
 * Extract routes from file content
 */
function extractRoutes(content, fileName, mountPath) {
  const routes = [];
  const routerMethodRegex = /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
  
  let match;
  while ((match = routerMethodRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    
    // Build full path
    let fullPath = mountPath;
    if (routePath && routePath !== '/') {
      fullPath = mountPath + (routePath.startsWith('/') ? routePath : '/' + routePath);
    }
    fullPath = fullPath.replace(/\/+/g, '/');
    
    // Generate route name
    const pathParts = fullPath.split('/').filter(p => p);
    const resource = pathParts[pathParts.length - 2] || pathParts[0] || 'root';
    const action = method.toLowerCase();
    const hasId = routePath.includes(':');
    const routeName = `${resource}.${action}${hasId ? 'ById' : ''}`;
    
    // Generate description
    const actionName = {
      'GET': 'Get', 'POST': 'Create', 'PUT': 'Update',
      'DELETE': 'Delete', 'PATCH': 'Update'
    }[method] || method;
    const description = `${actionName} ${resource}${hasId ? ' by ID' : ''}`;
    
    routes.push({
      name: routeName,
      path: fullPath,
      method,
      description,
      permissions: {
        roles: ['admin'],
        actions: [method === 'GET' ? 'read' : method === 'POST' ? 'create' : 'update'],
        resource: 'Resource'
      }
    });
  }
  
  return routes;
}

/**
 * Main function to generate routes metadata
 */
function generateRoutesMetadata() {
  try {
    console.log('\n🔍 Scanning routes...\n');
    
    // Step 1: Parse main index.js
    const mainMountings = parseMainIndexMountings();
    
    // Step 2: Find all route files
    const routeFiles = getAllRouteFiles(routesDir);
    console.log(`✓ Found ${routeFiles.length} route files\n`);
    
    // Step 3: Process each file
    const routesMetadata = {};
    let totalRoutes = 0;
    
    routeFiles.forEach(filePath => {
      const fileName = path.basename(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const mountPath = determineMountPath(filePath, mainMountings);
      const routes = extractRoutes(content, fileName, mountPath);
      
      console.log(`  ${fileName}: ${routes.length} routes → ${mountPath}`);
      
      routes.forEach(route => {
        routesMetadata[route.name] = {
          path: route.path,
          method: route.method,
          description: route.description,
          permissions: route.permissions
        };
      });
      
      totalRoutes += routes.length;
    });
    
    // Step 4: Write to file
    const fileContent = `/**
 * Routes Metadata
 * Auto-generated by scripts/generateRoutesMetadata-v2.js
 * 
 * To update: npm run generate:routes
 * 
 * Total routes: ${totalRoutes}
 * Generated: ${new Date().toISOString()}
 */

const routesMetadata = ${JSON.stringify(routesMetadata, null, 2)};

module.exports = routesMetadata;
`;
    
    fs.writeFileSync(outputFile, fileContent);
    
    console.log(`\n✅ Generated ${totalRoutes} routes successfully`);
    console.log(`📁 Output: ${outputFile}\n`);
    
    return routesMetadata;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateRoutesMetadata();
}

module.exports = { generateRoutesMetadata };
