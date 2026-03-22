import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentPage from './pages/PaymentPage';
import OrderStatusPage from './pages/OrderStatusPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/:slug" element={<AdminPage />} />
        <Route path="/:slug" element={<MenuPage />} />
        <Route path="/:slug/checkout" element={<CheckoutPage />} />
        <Route path="/:slug/payment/:pedidoId" element={<PaymentPage />} />
        <Route path="/pedido/:pedidoId" element={<OrderStatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
