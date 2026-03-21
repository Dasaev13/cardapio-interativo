import { Router } from 'express';
import menuRoutes from './menu.routes';
import deliveryRoutes from './delivery.routes';
import ordersRoutes from './orders.routes';
import paymentsRoutes from './payments.routes';
import webhooksRoutes from './webhooks.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/menu', menuRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/admin', adminRoutes);

export default router;
