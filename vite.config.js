import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        pos: resolve(__dirname, 'pos.html'),
        sales: resolve(__dirname, 'sales.html'),
        products: resolve(__dirname, 'products.html'),
        stock: resolve(__dirname, 'stock.html'),
        customers: resolve(__dirname, 'customers.html'),
        balance: resolve(__dirname, 'balance.html'),
        cheque: resolve(__dirname, 'cheque.html'),
        expenses: resolve(__dirname, 'expenses.html'),
        reports: resolve(__dirname, 'reports.html'),
        settings: resolve(__dirname, 'settings.html'),
        editBill: resolve(__dirname, 'edit-bill.html'),
        viewSale: resolve(__dirname, 'view-sale.html')
      }
    }
  }
});
