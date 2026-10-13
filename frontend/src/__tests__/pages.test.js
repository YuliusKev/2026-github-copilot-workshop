import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import RequisitionCreatePage from '../pages/RequisitionCreatePage.vue';
import RequisitionListPage from '../pages/RequisitionListPage.vue';
import PurchaseOrderCreatePage from '../pages/PurchaseOrderCreatePage.vue';
import PurchaseOrderListPage from '../pages/PurchaseOrderListPage.vue';
import PurchaseOrderDetailPage from '../pages/PurchaseOrderDetailPage.vue';
import { api } from '../api';

vi.mock('vue-router', () => ({
  RouterLink: { template: '<a><slot /></a>' },
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: { id: 'po-1' } }),
}));

vi.mock('../api', () => ({
  api: {
    listRequisitions: vi.fn(),
    createRequisition: vi.fn(),
    getRequisitionOpenLines: vi.fn(),
    listPurchaseOrders: vi.fn(),
    getPurchaseOrder: vi.fn(),
    createPurchaseOrder: vi.fn(),
    submitPurchaseOrder: vi.fn(),
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
        createdAt: '2026-06-15T08:00:00.000Z',
      }],
    });

    const wrapper = mount(PurchaseOrderListPage);
    await flushPromises();

    expect(api.listPurchaseOrders).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('PO-2026-0001');
    expect(wrapper.text()).toContain('PT Supplier Jaya');
    expect(wrapper.text()).toContain('DRAFT');
    expect(wrapper.text()).toContain('2026-06-15');
  });

  it('renders PO line allocations and submits a draft', async () => {
    const purchaseOrder = {
      id: 'po-1',
      poNumber: 'PO-2026-0001',
      vendorName: 'PT Supplier Jaya',
      status: 'DRAFT',
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
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(api.submitPurchaseOrder).toHaveBeenCalledExactlyOnceWith('po-1');
    expect(wrapper.text()).toContain('SUBMITTED');
    expect(wrapper.find('button').exists()).toBe(false);
  });
});