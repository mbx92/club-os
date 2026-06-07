Frontend Implementation Guide: Product Image Upload
Backend has been updated to support multipart/form-data for creating and updating products.

Endpoint Details
Create Product: POST /api/v1/restaurant/products
Update Product: PUT /api/v1/restaurant/products/:id
Payload Format
You must use FormData to send data. JSON body will NOT work for file uploads.

Example Implementation (Vue/Nuxt + Axios)
javascript
// Function to prepare FormData
const prepareProductFormData = (productData, imageFile) => {
  const formData = new FormData();
  // Append simple fields
  formData.append('name', productData.name);
  formData.append('sku', productData.sku);
  formData.append('price', productData.price);
  formData.append('cost', productData.cost);
  // ... append other fields
  // Handle nested objects (like productDetails) if necessary
  // formData.append('productDetails', JSON.stringify(productData.productDetails));
  // Append image file if selected
  if (imageFile) {
    formData.append('image', imageFile); // 'image' MUST be the key
  }
  return formData;
};
// Usage in Create
const createProduct = async (productData, imageFile) => {
  const formData = prepareProductFormData(productData, imageFile);
  
  await axios.post('/api/v1/restaurant/products', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};
// Usage in Update
const updateProduct = async (id, productData, imageFile) => {
  const formData = prepareProductFormData(productData, imageFile);
  
  await axios.put(`/api/v1/restaurant/products/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};
Important Notes
Field Name: The file input field name MUST be image.
JSON vs FormData: Do not mix JSON and FormData. If you are updating a product without changing the image, you can still use JSON, but for consistency, it's often easier to switch the whole form submission to FormData.
Note: The backend is designed to handle this, but sending multipart/form-data without a file is also valid.
Existing Image URL: If no new file is selected, but the product has an existing image URL, you generally don't need to send the image field in FormData. The backend will only update the image if a file is provided.