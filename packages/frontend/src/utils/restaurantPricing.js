const parsePrice = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const getProductBasePrice = (product) => {
  return parsePrice(product?.price) ?? 0
}

export const getProductVariants = (product) => {
  if (!Array.isArray(product?.productDetails?.variants)) {
    return []
  }

  return product.productDetails.variants.filter(variant => variant && typeof variant === 'object')
}

export const getDefaultProductVariant = (product) => {
  const variants = getProductVariants(product)
  if (variants.length === 0) {
    return null
  }

  return variants.find(variant => String(variant.name || '').trim().toLowerCase() === 'regular') || variants[0]
}

export const getVariantEffectivePrice = (product, variant) => {
  return parsePrice(variant?.price) ?? getProductBasePrice(product)
}

export const getMinProductPrice = (product) => {
  const variants = getProductVariants(product)
  if (variants.length === 0) {
    return getProductBasePrice(product)
  }

  return Math.min(...variants.map(variant => getVariantEffectivePrice(product, variant)))
}
