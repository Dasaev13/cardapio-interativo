import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getLoja, updateLoja,
  listProdutos, createProduto, updateProduto, deleteProduto,
  listCategorias, createCategoria, updateCategoria,
  listBairros, createBairro, updateBairro, deleteBairro,
  listSessions, takeoverSession, releaseSession,
  reprintOrder, getDashboardStats,
} from '../controllers/admin.controller';
import { listOrders, updateOrderStatus, listMesas, fecharMesa } from '../controllers/orders.controller';

const router = Router();

// Todas as rotas admin requerem autenticação
router.use(requireAuth);

// Loja
router.get('/loja', getLoja);
router.put('/loja', updateLoja);

// Dashboard
router.get('/stats', getDashboardStats);

// Produtos
router.get('/produtos', listProdutos);
router.post('/produtos', createProduto);
router.put('/produtos/:id', updateProduto);
router.delete('/produtos/:id', deleteProduto);

// Categorias
router.get('/categorias', listCategorias);
router.post('/categorias', createCategoria);
router.put('/categorias/:id', updateCategoria);

// Pedidos
router.get('/pedidos', listOrders);
router.put('/pedidos/:id/status', updateOrderStatus);
router.post('/pedidos/:id/print', reprintOrder);

// Mesas (comanda)
router.get('/mesas', listMesas);
router.put('/mesas/:mesa/fechar', fecharMesa);

// Bairros de entrega
router.get('/bairros', listBairros);
router.post('/bairros', createBairro);
router.put('/bairros/:id', updateBairro);
router.delete('/bairros/:id', deleteBairro);

// Sessões WhatsApp
router.get('/sessions', listSessions);
router.post('/sessions/:id/takeover', requireRole(['gerente', 'admin']), takeoverSession);
router.post('/sessions/:id/release', releaseSession);

export default router;
