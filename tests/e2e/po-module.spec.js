const { test, expect } = require('@playwright/test');

const apiUrl = process.env.E2E_API_BASE_URL || 'http://localhost:3000';

async function createApprovedRequisition(request) {
  const itemName = `PO module item ${Date.now()}`;
  const response = await request.post(`${apiUrl}/api/requisitions`, {
    data: {
      requesterName: 'PO Module E2E',
      departmentName: 'Workshop',
      title: itemName,
      lines: [{
        itemCode: 'PO-MODULE-E2E',
        itemName,
        qtyRequested: 10,
        uom: 'PCS',
        estUnitPrice: 1250,
        siteCode: 'WH-JKT',
      }],
    },
  });
  expect(response.status()).toBe(201);

  const requisition = await response.json();
  const submitResponse = await request.post(`${apiUrl}/api/requisitions/${requisition.id}/submit`);
  expect(submitResponse.ok()).toBeTruthy();
  const approveResponse = await request.post(`${apiUrl}/api/requisitions/${requisition.id}/approve`);
  expect(approveResponse.ok()).toBeTruthy();

  return { ...requisition, itemName };
}

function purchaseOrderPayload(requisition, qtyOrdered) {
  const line = requisition.lines[0];
  return {
    vendorName: 'PO Module Supplier',
    lines: [{
      prLineId: line.id,
      itemCode: line.itemCode,
      itemName: line.itemName,
      uom: line.uom,
      siteCode: line.siteCode,
      unitPrice: line.estUnitPrice,
      qtyOrdered,
    }],
  };
}

async function fillPurchaseOrder(page, requisition, qtyOrdered) {
  await page.goto('/purchase-orders/new');
  await page.getByLabel(`Select ${requisition.prNumber} line 1`, { exact: true }).check();
  await page.getByLabel('Vendor', { exact: true }).fill('PO Module Supplier');
  await page.getByLabel(`Order quantity for ${requisition.itemName}`, { exact: true })
    .fill(String(qtyOrdered));
}

test('creates, lists, opens, and submits a purchase order', async ({ page, request }, testInfo) => {
  const requisition = await createApprovedRequisition(request);

  await page.goto('/');
  await page.getByRole('link', { name: 'Purchase Orders', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
  await page.getByRole('link', { name: '+ New PO', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create Purchase Order' })).toBeVisible();

  await fillPurchaseOrder(page, requisition, 3);
  const createResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/purchase-orders`
      && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save As Draft', exact: true }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const purchaseOrder = await createResponse.json();
  await expect(page.getByRole('status')).toContainText(`${purchaseOrder.poNumber}: draft saved.`);

  await page.screenshot({ path: testInfo.outputPath('po-create-draft.png'), fullPage: true });
  await page.getByRole('link', { name: 'Purchase Orders', exact: true }).click();
  await expect(page.getByRole('link', { name: purchaseOrder.poNumber, exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('po-list.png'), fullPage: true });

  await page.getByRole('link', { name: purchaseOrder.poNumber, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Purchase Order Detail' })).toBeVisible();
  const vendorField = page.locator('.form-group').filter({
    has: page.getByText('Vendor', { exact: true }),
  }).locator('input');
  await expect(vendorField).toHaveValue('PO Module Supplier');
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  const line = page.getByRole('row').filter({ hasText: requisition.itemName });
  await expect(line).toContainText(requisition.prNumber);
  await expect(line).toContainText('3');
  await page.screenshot({ path: testInfo.outputPath('po-detail-draft.png'), fullPage: true });

  const submitResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/purchase-orders/${purchaseOrder.id}/submit`
      && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit PO', exact: true }).click();
  const submitResponse = await submitResponsePromise;
  expect(submitResponse.status()).toBe(200);
  expect((await submitResponse.json()).status).toBe('SUBMITTED');
  await expect(page.getByText('SUBMITTED', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit PO', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('po-detail-submitted.png'), fullPage: true });
});

test('rejects an allocation that became excessive after the form loaded', async ({ page, request }, testInfo) => {
  const requisition = await createApprovedRequisition(request);
  await fillPurchaseOrder(page, requisition, 3);

  const competingResponse = await request.post(`${apiUrl}/api/purchase-orders`, {
    data: purchaseOrderPayload(requisition, 8),
  });
  expect(competingResponse.status()).toBe(201);

  const rejectedCreatePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/purchase-orders`
      && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit PO', exact: true }).click();
  const rejectedCreate = await rejectedCreatePromise;
  expect(rejectedCreate.status()).toBe(422);
  await expect(page.getByRole('alert')).toHaveText(
    'lines[0]: allocation qty 3 exceeds remaining 2',
  );
  await page.screenshot({ path: testInfo.outputPath('po-over-allocation-error.png'), fullPage: true });
});