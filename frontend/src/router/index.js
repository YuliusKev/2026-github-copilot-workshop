import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../pages/DashboardPage.vue';
import RequisitionListPage from '../pages/RequisitionListPage.vue';
import RequisitionCreatePage from '../pages/RequisitionCreatePage.vue';
import RequisitionDetailPage from '../pages/RequisitionDetailPage.vue';
import PurchaseOrderListPage from '../pages/PurchaseOrderListPage.vue';
import PurchaseOrderDetailPage from '../pages/PurchaseOrderDetailPage.vue';
import PurchaseOrderCreatePage from '../pages/PurchaseOrderCreatePage.vue';

const routes = [
  { path: '/', name: 'dashboard', component: DashboardPage },
  { path: '/requisitions', name: 'requisitions-list', component: RequisitionListPage },
  { path: '/requisitions/new', name: 'requisitions-create', component: RequisitionCreatePage },
  { path: '/purchase-orders', name: 'purchase-orders-list', component: PurchaseOrderListPage },
  { path: '/purchase-orders/new', name: 'purchase-orders-create', component: PurchaseOrderCreatePage },
  { path: '/requisitions/:id', name: 'requisitions-detail', component: RequisitionDetailPage, props: true },
  { path: '/purchase-orders/:id', name: 'purchase-orders-detail', component: PurchaseOrderDetailPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
