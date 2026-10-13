import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import RequisitionCreatePage from '../pages/RequisitionCreatePage.vue';
import RequisitionListPage from '../pages/RequisitionListPage.vue';
import PurchaseOrderCreatePage from '../pages/PurchaseOrderCreatePage.vue';
import PurchaseOrderListPage from '../pages/PurchaseOrderListPage.vue';
import PurchaseOrderDetailPage from '../pages/PurchaseOrderDetailPage.vue';
import App from '../App.vue';
import router from '../router';
import GoodsReceiptListPage from '../pages/GoodsReceiptListPage.vue';
import GoodsReceiptCreatePage from '../pages/GoodsReceiptCreatePage.vue';
import GoodsReceiptDetailPage from '../pages/GoodsReceiptDetailPage.vue';
import { api } from '../api';

vi.mock('vue-router', () => ({
  createRouter: vi.fn((options) => ({ getRoutes: () => options.routes })),
  createWebHistory: vi.fn(),
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div />' },
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/', params: { id: 'po-1' } }),
}));

vi.mock('../api', () => ({
  api: {
    listRequisitions: vi.fn(),
    createRequisition: vi.fn(),
    getRequisitionOpenLines: vi.fn(),
    listPurchaseOrders: vi.fn(),
    getPurchaseOrderOpenLines: vi.fn(),
    bookmarkPurchaseOrder: vi.fn(),
    removePurchaseOrderBookmark: vi.fn(),
    getPurchaseOrder: vi.fn(),
    createPurchaseOrder: vi.fn(),
    submitPurchaseOrder: vi.fn(),
    listGoodsReceipts: vi.fn(),
    createGoodsReceipt: vi.fn(),
    getGoodsReceipt: vi.fn(),
    postGoodsReceipt: vi.fn(),
  },
}));

describe('requisition pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders requisitions returned by the list API', async () => {
    api.listRequisitions.mockResolvedValue({
      items: [{
        id: 'pr-1',
        prNumber: 'PR-2026-0001',
        requesterName: 'Rina',
        departmentName: 'Operations',
        title: 'Spare parts',
        status: 'APPROVED',
        neededByDate: '2026-06-15',
      }],
    });

    const wrapper = mount(RequisitionListPage);
    await flushPromises();

    expect(wrapper.get('h2').text()).toBe('Purchase Requisitions');
    expect(wrapper.text()).toContain('PR-2026-0001');
    expect(wrapper.text()).toContain('Rina');
    expect(wrapper.text()).toContain('APPROVED');
  });

  it('renders required fields and quantity limits on the create form', () => {
    const wrapper = mount(RequisitionCreatePage);

    expect(wrapper.get('h2').text()).toBe('Create Purchase Requisition');
    expect(wrapper.findAll('input[required]')).toHaveLength(9);
    expect(wrapper.get('input[type="number"][min="0.01"]').exists()).toBe(true);
    expect(wrapper.get('input[type="number"][min="0"]').exists()).toBe(true);
  });
});

describe('purchase order create page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listRequisitions.mockResolvedValue({ items: [
      { id: 'pr-1', status: 'APPROVED' },
      { id: 'pr-draft', status: 'DRAFT' },
    ] });
    api.getRequisitionOpenLines.mockResolvedValue({
      requisition: { id: 'pr-1', prNumber: 'PR-2026-0001', status: 'APPROVED' },
      openLines: [{
        id: 'line-1', lineNo: 1, itemCode: 'PART-1', itemName: 'Spare part',
        uom: 'PCS', siteCode: 'WH-JKT', qtyRequested: 10, qtyAllocated: 4,
        qtyOpenForPo: 6, estUnitPrice: 1250, requiredDate: null,
      }],
    });
    api.createPurchaseOrder.mockResolvedValue({ id: 'po-1', poNumber: 'PO-2026-0001', status: 'DRAFT' });
    api.submitPurchaseOrder.mockResolvedValue({ id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' });
  });

  async function filledPage(quantity = '3') {
    const wrapper = mount(PurchaseOrderCreatePage);
    await flushPromises();
    await wrapper.get('#po-vendor').setValue('PT Supplier Jaya');
    await wrapper.get('input[type="checkbox"]').setValue(true);
    await wrapper.get('[aria-label="Order quantity for Spare part"]').setValue(quantity);
    return wrapper;
  }

  it('loads only approved PR open lines and creates a mapped draft', async () => {
    const wrapper = await filledPage();
    await wrapper.get('#po-needed-by').setValue('2026-10-20');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.getRequisitionOpenLines).toHaveBeenCalledExactlyOnceWith('pr-1');
    expect(api.createPurchaseOrder).toHaveBeenCalledExactlyOnceWith({
      vendorName: 'PT Supplier Jaya',
      lines: [{ prLineId: 'line-1', itemCode: 'PART-1', itemName: 'Spare part',
        uom: 'PCS', qtyOrdered: 3, unitPrice: 1250, siteCode: 'WH-JKT', requiredDate: '2026-10-20' }],
    });
    expect(api.submitPurchaseOrder).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('PO-2026-0001: draft saved.');
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined();
  });

  it('blocks over-allocation with a clear message', async () => {
    const wrapper = await filledPage('7');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toContain('allocation qty 7 exceeds remaining 6');
    expect(api.createPurchaseOrder).not.toHaveBeenCalled();
  });

  it('blocks missing vendor, empty selection, and zero quantity', async () => {
    const wrapper = mount(PurchaseOrderCreatePage);
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toBe('Vendor is required.');
    await wrapper.get('#po-vendor').setValue('Vendor');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toContain('Select at least one');
    await wrapper.get('input[type="checkbox"]').setValue(true);
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toContain('order quantity must be greater than 0');
    expect(api.createPurchaseOrder).not.toHaveBeenCalled();
  });

  it('creates and submits a PO directly', async () => {
    const wrapper = await filledPage();
    await wrapper.get('.btn-primary').trigger('click');
    await flushPromises();
    expect(api.createPurchaseOrder).toHaveBeenCalledTimes(1);
    expect(api.submitPurchaseOrder).toHaveBeenCalledExactlyOnceWith('po-1');
    expect(wrapper.text()).toContain('PO-2026-0001: submitted.');
  });

  it('reuses the saved draft on submission retries', async () => {
    const wrapper = await filledPage();
    api.submitPurchaseOrder.mockRejectedValueOnce(new Error('Only DRAFT purchase order can be submitted'));
    await wrapper.get('.btn-primary').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('draft saved. Submission failed: Only DRAFT');
    await wrapper.get('.btn-primary').trigger('click');
    await flushPromises();
    expect(api.createPurchaseOrder).toHaveBeenCalledTimes(1);
    expect(api.submitPurchaseOrder).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('PO-2026-0001: submitted.');
  });

  it('displays stale-allocation errors from the server', async () => {
    const wrapper = await filledPage();
    api.createPurchaseOrder.mockRejectedValueOnce(new Error('lines[0]: allocation qty 3 exceeds remaining 2'));
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('lines[0]: allocation qty 3 exceeds remaining 2');
    expect(wrapper.get('fieldset').attributes('disabled')).toBeUndefined();
  });

  it('refreshes remaining quantities while preserving entered values', async () => {
    const wrapper = await filledPage();
    const response = await api.getRequisitionOpenLines();
    api.getRequisitionOpenLines.mockResolvedValue({ ...response,
      openLines: [{ ...response.openLines[0], qtyAllocated: 8, qtyOpenForPo: 2 }],
    });
    await wrapper.get('.refresh-button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[aria-label="Order quantity for Spare part"]').element.value).toBe('3');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toContain('exceeds remaining 2');
  });

  it('shows loading failures and empty results', async () => {
    api.listRequisitions.mockRejectedValueOnce(new Error('Unable to load PR lines'));
    const wrapper = mount(PurchaseOrderCreatePage);
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('Unable to load PR lines');
    api.listRequisitions.mockResolvedValue({ items: [] });
    await wrapper.get('.refresh-button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('No approved PR lines are available');
  });
});

describe('purchase order list and detail pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders purchase orders returned by the list API', async () => {
    api.listPurchaseOrders.mockResolvedValue({
      items: [{
        id: 'po-1',
        poNumber: 'PO-2026-0001',
        vendorName: 'PT Supplier Jaya',
        status: 'DRAFT',
        isBookmarked: true,
        createdAt: '2026-06-15T08:00:00.000Z',
      }],
    });

    const wrapper = mount(PurchaseOrderListPage);
    await flushPromises();

    expect(api.listPurchaseOrders).toHaveBeenCalledExactlyOnceWith(false);
    expect(wrapper.text()).toContain('PO-2026-0001');
    expect(wrapper.text()).toContain('PT Supplier Jaya');
    expect(wrapper.text()).toContain('DRAFT');
    expect(wrapper.text()).toContain('2026-06-15');
    expect(wrapper.get('button[aria-label="Remove bookmark"]').exists()).toBe(true);
  });

  it('toggles a bookmark from the PO list and updates the row state', async () => {
    api.listPurchaseOrders.mockResolvedValue({ items: [{
      id: 'po-1', poNumber: 'PO-2026-0001', vendorName: 'PT Supplier Jaya',
      status: 'DRAFT', isBookmarked: false, createdAt: '2026-06-15T08:00:00.000Z',
    }] });
    api.bookmarkPurchaseOrder.mockResolvedValue({ id: 'po-1', isBookmarked: true });

    const wrapper = mount(PurchaseOrderListPage);
    await flushPromises();
    await wrapper.get('button[aria-label="Bookmark purchase order"]').trigger('click');
    await flushPromises();

    expect(api.bookmarkPurchaseOrder).toHaveBeenCalledExactlyOnceWith('po-1');
    expect(wrapper.get('button[aria-label="Remove bookmark"]').exists()).toBe(true);
  });

  it('filters bookmarked POs and displays the empty state', async () => {
    api.listPurchaseOrders
      .mockResolvedValueOnce({ items: [{
        id: 'po-1', poNumber: 'PO-2026-0001', vendorName: 'PT Supplier Jaya',
        status: 'DRAFT', isBookmarked: true, createdAt: '2026-06-15T08:00:00.000Z',
      }] })
      .mockResolvedValueOnce({ items: [] });

    const wrapper = mount(PurchaseOrderListPage);
    await flushPromises();
    await wrapper.get('input[type="checkbox"]').setValue(true);
    await flushPromises();

    expect(api.listPurchaseOrders).toHaveBeenNthCalledWith(1, false);
    expect(api.listPurchaseOrders).toHaveBeenNthCalledWith(2, true);
    expect(wrapper.get('[role="status"]').text()).toBe('No bookmarked purchase orders found.');
  });

  it('shows bookmark loading and API error states', async () => {
    let resolveBookmark;
    api.listPurchaseOrders.mockResolvedValue({ items: [{
      id: 'po-1', poNumber: 'PO-2026-0001', vendorName: 'PT Supplier Jaya',
      status: 'DRAFT', isBookmarked: false, createdAt: '2026-06-15T08:00:00.000Z',
    }] });
    api.bookmarkPurchaseOrder.mockReturnValue(new Promise((resolve) => {
      resolveBookmark = resolve;
    }));

    const wrapper = mount(PurchaseOrderListPage);
    await flushPromises();
    const button = wrapper.get('button[aria-label="Bookmark purchase order"]');
    await button.trigger('click');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.text()).toContain('Saving...');

    resolveBookmark({ id: 'po-1', isBookmarked: true });
    await flushPromises();
    expect(wrapper.get('button[aria-label="Remove bookmark"]').exists()).toBe(true);

    api.removePurchaseOrderBookmark.mockRejectedValueOnce(new Error('Bookmark update failed'));
    await wrapper.get('button[aria-label="Remove bookmark"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('Bookmark update failed');
    expect(wrapper.get('button[aria-label="Remove bookmark"]').exists()).toBe(true);
  });

  it('renders PO line allocations and submits a draft', async () => {
    const purchaseOrder = {
      id: 'po-1',
      poNumber: 'PO-2026-0001',
      vendorName: 'PT Supplier Jaya',
      status: 'DRAFT',
      isBookmarked: false,
      lines: [{
        id: 'po-line-1',
        lineNo: 1,
        itemCode: 'PART-1',
        itemName: 'Spare part',
        qtyOrdered: 3,
        qtyReceived: 1,
        qtyOpenForGr: 2,
        uom: 'PCS',
        unitPrice: 1250,
        siteCode: 'WH-JKT',
        requiredDate: '2026-06-20',
        allocations: [{ prNumber: 'PR-2026-0001', allocatedQty: 3 }],
      }],
    };
    api.getPurchaseOrder.mockResolvedValue(purchaseOrder);
    api.submitPurchaseOrder.mockResolvedValue({ ...purchaseOrder, status: 'SUBMITTED' });

    const wrapper = mount(PurchaseOrderDetailPage);
    await flushPromises();

    expect(api.getPurchaseOrder).toHaveBeenCalledExactlyOnceWith('po-1');
    expect(wrapper.get('input[disabled]').element.value).toBe('PO-2026-0001');
    expect(wrapper.findAll('input[disabled]')[1].element.value).toBe('PT Supplier Jaya');
    expect(wrapper.text()).toContain('Spare part');
    expect(wrapper.text()).toContain('PR-2026-0001 (3)');
    api.bookmarkPurchaseOrder.mockResolvedValue({ id: 'po-1', isBookmarked: true });
    await wrapper.get('button[aria-label="Bookmark purchase order"]').trigger('click');
    await flushPromises();
    expect(api.bookmarkPurchaseOrder).toHaveBeenCalledExactlyOnceWith('po-1');
    expect(wrapper.get('button[aria-label="Remove bookmark"]').exists()).toBe(true);

    await wrapper.get('button.btn-primary').trigger('click');
    await flushPromises();

    expect(api.submitPurchaseOrder).toHaveBeenCalledExactlyOnceWith('po-1');
    expect(wrapper.text()).toContain('SUBMITTED');
    expect(wrapper.find('button.btn-primary').exists()).toBe(false);
  });
});

describe('goods receipt navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Goods Receipts navigation link and registers all GR routes', () => {
    const wrapper = mount(App);

    expect(wrapper.text()).toContain('Goods Receipts');
    expect(router.getRoutes().map((route) => route.path)).toEqual(expect.arrayContaining([
      '/goods-receipts',
      '/goods-receipts/new',
      '/goods-receipts/:id',
    ]));
  });

  it('offers receipt creation from a submitted PO with open lines', async () => {
    api.getPurchaseOrder.mockResolvedValue({
      id: 'po-1',
      poNumber: 'PO-2026-0001',
      vendorName: 'PT Supplier Jaya',
      status: 'SUBMITTED',
      isBookmarked: false,
      lines: [{ id: 'line-1', itemCode: 'PART-1', itemName: 'Spare part', qtyOpenForGr: 2 }],
    });

    const wrapper = mount(PurchaseOrderDetailPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Receive Goods');
  });

  it('lists receipts and renders the empty state', async () => {
    api.listGoodsReceipts.mockResolvedValue({ items: [{
      id: 'gr-1', grNumber: 'GR-2026-0001', poId: 'po-1', poNumber: 'PO-2026-0001',
      receiptDate: '2026-10-13', status: 'DRAFT', notes: 'First delivery',
    }] });
    const wrapper = mount(GoodsReceiptListPage);
    await flushPromises();
    expect(wrapper.text()).toContain('GR-2026-0001');
    expect(wrapper.text()).toContain('PO-2026-0001');

    api.listGoodsReceipts.mockResolvedValueOnce({ items: [] });
    const emptyWrapper = mount(GoodsReceiptListPage);
    await flushPromises();
    expect(emptyWrapper.get('[role="status"]').text()).toBe('No goods receipts found.');
  });

  it('creates a partial receipt using PO line defaults and preserves the form on API error', async () => {
    api.listPurchaseOrders.mockResolvedValue({ items: [
      { id: 'po-1', poNumber: 'PO-2026-0001', vendorName: 'PT Supplier', status: 'SUBMITTED' },
      { id: 'po-draft', poNumber: 'PO-2026-0002', vendorName: 'Draft Supplier', status: 'DRAFT' },
    ] });
    api.getPurchaseOrderOpenLines.mockResolvedValue({
      purchaseOrder: { id: 'po-1', poNumber: 'PO-2026-0001', status: 'SUBMITTED' },
      openLines: [{
        id: 'po-line-1', itemCode: 'ITEM-1', itemName: 'Safety Helmet', uom: 'PCS',
        siteCode: 'WH-JKT', qtyOpenForGr: 8,
      }],
    });
    api.createGoodsReceipt.mockRejectedValueOnce(new Error('Receipt quantity is no longer open'));

    const wrapper = mount(GoodsReceiptCreatePage);
    await flushPromises();
    expect(wrapper.get('#gr-po').findAll('option')).toHaveLength(2);
    await wrapper.get('#gr-po').setValue('po-1');
    await flushPromises();
    const checkbox = wrapper.get('[aria-label="Receive Safety Helmet"]');
    expect(checkbox.element.checked).toBe(false);
    await checkbox.setValue(true);
    await wrapper.get('[aria-label="Received quantity for Safety Helmet"]').setValue('3');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.createGoodsReceipt).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      poId: 'po-1',
      lines: [{ poLineId: 'po-line-1', qtyReceived: 3, actualSiteCode: 'WH-JKT' }],
    }));
    expect(wrapper.get('[role="alert"]').text()).toBe('Receipt quantity is no longer open');
    expect(wrapper.get('[aria-label="Received quantity for Safety Helmet"]').element.value).toBe('3');
  });

  it('loads receipt detail and preserves the draft if posting fails', async () => {
    api.getGoodsReceipt.mockResolvedValue({
      id: 'gr-1', grNumber: 'GR-2026-0001', poId: 'po-1', poNumber: 'PO-2026-0001',
      status: 'DRAFT', receiptDate: '2026-10-13', notes: null,
      lines: [{ id: 'gr-line-1', lineNo: 1, itemCode: 'ITEM-1', itemName: 'Safety Helmet',
        qtyReceived: 3, uom: 'PCS', actualSiteCode: 'WH-JKT' }],
    });
    api.postGoodsReceipt.mockRejectedValueOnce(new Error('Receipt exceeds the remaining PO quantity'));

    const wrapper = mount(GoodsReceiptDetailPage);
    await flushPromises();
    expect(wrapper.text()).toContain('GR-2026-0001');
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('DRAFT');
    expect(wrapper.get('[role="alert"]').text()).toBe('Receipt exceeds the remaining PO quantity');
    expect(wrapper.get('button').text()).toBe('Post Receipt');
  });
});