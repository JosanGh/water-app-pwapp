export const PRODUCTS = {
  water: {
    id: "water",
    name: "Water Factory",
  },
  electricalShop: {
    id: "electrical-shop",
    name: "Electrical Shop",
  },
  supermarket: {
    id: "supermarket",
    name: "Supermarket",
  },
};

export const PRODUCT_OPTIONS = Object.values(PRODUCTS);

export const getProduct = (productId) =>
  PRODUCT_OPTIONS.find((product) => product.id === productId) || null;

export const isProductPage = (pageId) =>
  PRODUCT_OPTIONS.some(
    (product) => product.id !== PRODUCTS.water.id && product.id === pageId,
  );
