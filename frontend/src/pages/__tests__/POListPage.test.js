import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { RouterLink } from 'vue-router';

// Mock API before importing any components that use it
vi.mock('../../api', () => ({
  api: {
    listPurchaseOrders: vi.fn(),
  },
}));

describe('POListPage', () => {
  let mockApi;

  beforeEach(async () => {
    // Import the mocked API
    const apiModule = await import('../../api');
    mockApi = apiModule.api;
    mockApi.listPurchaseOrders.mockClear();
  });

  it('renders the page header with title and description', async () => {
    mockApi.listPurchaseOrders.mockResolvedValue({ items: [] });
    
    const mod = await import('../POListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    expect(wrapper.text()).toContain('Purchase Orders');
    expect(wrapper.text()).toContain('View and manage purchase orders');
  });

  it('provides a link to create new purchase order', async () => {
    mockApi.listPurchaseOrders.mockResolvedValue({ items: [] });
    
    const mod = await import('../POListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    const createLink = wrapper.find('a[href="/purchase-orders/new"]');
    expect(createLink.exists()).toBe(true);
    expect(createLink.text()).toContain('New PO');
  });

  it('displays empty state when no purchase orders exist', async () => {
    mockApi.listPurchaseOrders.mockResolvedValue({ items: [] });
    
    const mod = await import('../POListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(wrapper.text()).toContain('No purchase orders yet');
  });

  it('renders table with purchase order data', async () => {
    const mockItems = [
      {
        id: 'po-1',
        poNumber: 'PO-2026-0001',
        vendorName: 'PT Supplier Jaya',
        status: 'DRAFT',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'po-2',
        poNumber: 'PO-2026-0002',
        vendorName: 'Tech Hardware Ltd',
        status: 'SUBMITTED',
        createdAt: '2026-09-02T00:00:00.000Z',
      },
    ];

    mockApi.listPurchaseOrders.mockResolvedValue({ items: mockItems });
    
    const mod = await import('../POListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('PO-2026-0001');
    expect(rows[0].text()).toContain('PT Supplier Jaya');
    expect(rows[1].text()).toContain('PO-2026-0002');
    expect(rows[1].text()).toContain('Tech Hardware Ltd');
  });

  it('displays status badges with appropriate styling', async () => {
    const mockItems = [
      {
        id: 'po-1',
        poNumber: 'PO-2026-0001',
        vendorName: 'PT Supplier Jaya',
        status: 'SUBMITTED',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ];

    mockApi.listPurchaseOrders.mockResolvedValue({ items: mockItems });
    
    const mod = await import('../POListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    const badge = wrapper.find('.status-badge');
    expect(badge.text()).toBe('SUBMITTED');
    expect(badge.classes()).toContain('submitted');
  });

  it('provides navigation links to PO detail pages', async () => {
    const mockItems = [
      {
        id: 'po-123',
        poNumber: 'PO-2026-0001',
        vendorName: 'PT Supplier Jaya',
        status: 'DRAFT',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ];

    mockApi.listPurchaseOrders.mockResolvedValue({ items: mockItems });
    
    const mod = await import('../POListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    const viewLink = wrapper.find('a[href="/purchase-orders/po-123"]');
    expect(viewLink.exists()).toBe(true);
    expect(viewLink.text()).toBe('View');
  });

  it('calls API on component mount', async () => {
    mockApi.listPurchaseOrders.mockResolvedValue({ items: [] });
    
    const mod = await import('../POListPage.vue');
    const Component = mod.default;
    
    mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockApi.listPurchaseOrders).toHaveBeenCalledTimes(1);
  });

  it('renders correct table headers', async () => {
    mockApi.listPurchaseOrders.mockResolvedValue({
      items: [
        {
          id: 'po-1',
          poNumber: 'PO-2026-0001',
          vendorName: 'Acme',
          status: 'DRAFT',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    });
    
    const mod = await import('../POListPage.vue');
    const Component = mod.default;
    
    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    const headers = wrapper.findAll('thead th');
    const headerTexts = headers.map(h => h.text());
    expect(headerTexts).toContain('PO Number');
    expect(headerTexts).toContain('Vendor');
    expect(headerTexts).toContain('Status');
    expect(headerTexts).toContain('Created At');
    expect(headerTexts).toContain('Action');
  });

  it('displays error message when API fails', async () => {
    mockApi.listPurchaseOrders.mockRejectedValue(new Error('Network error'));

    const mod = await import('../POListPage.vue');
    const Component = mod.default;

    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(wrapper.text()).toContain('Network error');
  });
});
