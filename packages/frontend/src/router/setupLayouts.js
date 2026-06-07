const DEFAULT_LAYOUT = 'default'

const modules = import.meta.glob('../layouts/*.vue', { eager: true })

const layouts = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => {
    const match = path.match(/\/([^/]+)\.vue$/)
    return [match[1], module.default]
  }),
)

const getLayoutComponent = (layoutName, route) => {
  const resolvedName = layoutName || DEFAULT_LAYOUT
  const component = layouts[resolvedName]

  if (component)
    return component

  console.warn(
    `[router] Layout "${resolvedName}" not found for route "${route.path}". Falling back to "${DEFAULT_LAYOUT}".`,
  )

  return layouts[DEFAULT_LAYOUT]
}

const wrapRouteWithLayout = (route, layoutName) => ({
  path: route.path,
  component: getLayoutComponent(layoutName, route),
  children: route.path === '/' ? [route] : [{ ...route, path: '' }],
  meta: {
    isLayout: true,
  },
})

export const setupLayouts = (routes) => {
  const deepSetupLayout = (routeRecords, top = true) => routeRecords.map((route) => {
    if (route.children?.length > 0)
      route.children = deepSetupLayout(route.children, false)

    if (top) {
      const skipLayout = !route.component
        && route.children?.some(child => (child.path === '' || child.path === '/') && child.meta?.isLayout)

      if (skipLayout || route.meta?.layout === false)
        return route

      return wrapRouteWithLayout(route, route.meta?.layout)
    }

    if (route.meta?.layout)
      return wrapRouteWithLayout(route, route.meta.layout)

    return route
  })

  return deepSetupLayout(routes)
}
