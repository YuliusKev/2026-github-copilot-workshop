import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { RouterLink } from 'vue-router';

// Mock API before importing any components that use it
vi.mock('../../api', () => ({
  api: {
    listGoodsReceipts: vi.fn(),
  },
}));

describe('GRListPage', () => {
  let mockApi;

  beforeEach(async () => {
    const apiModule = await import('../../api');
    mockApi = apiModule.api;
    mockApi.listGoodsReceipts.mockClear();
  });

  it('renders the page header with title and description', async () => {
    mockApi.listGoodsReceipts.mockResolvedValue({ items: [] });

    const mod = await import('../GRListPage.vue');
    const Component = mod.default;

    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    expect(wrapper.text()).toContain('Goods Receipts');
    expect(wrapper.text()).toContain('View and manage goods receipts');
  });

  it('provides a link to create new goods receipt', async () => {
    mockApi.listGoodsReceipts.mockResolvedValue({ items: [] });

    const mod = await import('../GRListPage.vue');
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

    const createLink = wrapper.find('a[href="/goods-receipts/new"]');
    expect(createLink.exists()).toBe(true);
    expect(createLink.text()).toContain('New GR');
  });

  it('displays empty state when no goods receipts exist', async () => {
    mockApi.listGoodsReceipts.mockResolvedValue({ items: [] });

    const mod = await import('../GRListPage.vue');
    const Component = mod.default;

    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(wrapper.text()).toContain('No goods receipts yet');
  });

  it('renders table with goods receipt data', async () => {
    const mockItems = [
      {
        id: 'gr-1',
        grNumber: 'GR-2026-0001',
        poNumber: 'PO-2026-0001',
        status: 'DRAFT',
        createdAt: '2026-09-29T00:00:00.000Z',
      },
      {
        id: 'gr-2',
        grNumber: 'GR-2026-0002',
        poNumber: 'PO-2026-0002',
        status: 'POSTED',
        createdAt: '2026-09-29T00:00:00.000Z',
      },
    ];

    mockApi.listGoodsReceipts.mockResolvedValue({ items: mockItems });

    const mod = await import('../GRListPage.vue');
    const Component = mod.default;

    const wrapper = mount(Component, {
      global: {
        components: { RouterLink },
        stubs: { RouterLink: true },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('GR-2026-0001');
    expect(rows[0].text()).toContain('PO-2026-0001');
    expect(rows[1].text()).toContain('GR-2026-0002');
    expect(rows[1].text()).toContain('POSTED');
  });
});
