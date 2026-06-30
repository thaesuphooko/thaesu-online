import { MeiliSearch } from 'meilisearch';
const client = new MeiliSearch({ host: 'http://127.0.0.1:7700', apiKey: 'thaesu-secret-key' });
const index = client.index('products');

export async function syncProduct(product) {
  await index.addDocuments([{
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    category: product.category,
    tags: product.tags,
    image: product.media?.[0]?.url || '',
  }]);
}

export async function searchProducts(query, options = {}) {
  return index.search(query, { limit: 20, ...options });
}

export async function deleteProductIndex(productId) {
  await index.deleteDocument(productId);
}
