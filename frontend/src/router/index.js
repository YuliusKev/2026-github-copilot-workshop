import { createRouter, createWebHistory } from 'vue-router';
import DashboardPage from '../pages/DashboardPage.vue';
import RequisitionListPage from '../pages/RequisitionListPage.vue';
import RequisitionCreatePage from '../pages/RequisitionCreatePage.vue';
import RequisitionDetailPage from '../pages/RequisitionDetailPage.vue';
import PurchaseOrderCreatePage from '../pages/PurchaseOrderCreatePage.vue';

const routes = [
  { path: '/', name: 'dashboard', component: DashboardPage },
  { path: '/requisitions', name: 'requisitions-list', component: RequisitionListPage },
  { path: '/requisitions/new', name: 'requisitions-create', component: RequisitionCreatePage },
  { path: '/purchase-orders/new', name: 'purchase-orders-create', component: PurchaseOrderCreatePage },
  { path: '/requisitions/:id', name: 'requisitions-detail', component: RequisitionDetailPage, props: true },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
