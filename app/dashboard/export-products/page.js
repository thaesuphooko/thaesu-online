'use client';
import { useEffect } from 'react';
export default function ExportProductsPage() {
  useEffect(() => {
    window.location.href = '/api/admin/products/export';
  }, []);
  return <p>Downloading products CSV...</p>;
}
