const { test, expect } = require('@playwright/test');

const apiUrl = process.env.E2E_API_BASE_URL || 'http://localhost:3000';

function formField(page, label) {
  return page.locator('.form-group')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('input, textarea');
}

async function createApprovedRequisition(request) {
  const itemName = `PR over-allocation item ${Date.now()}`;
  const response = await request.post(`${apiUrl}/api/requisitions`, {
    data: {
      requesterName: 'PR Module E2E',
      departmentName: 'Workshop',
      title: itemName,
      lines: [{
        itemCode: 'PR-MODULE-E2E',
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

test('creates, lists, submits, and approves a purchase requisition', async ({ page }) => {
  const unique = Date.now();
  const requesterName = `PR Module E2E ${unique}`;
  const title = `Workshop supplies ${unique}`;
  const itemName = `Safety gloves ${unique}`;

  await page.goto('/requisitions');
  await page.getByRole('link', { name: '+ New PR', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create Purchase Requisition' })).toBeVisible();

  await formField(page, 'Requester Name').fill(requesterName);
  await formField(page, 'Department').fill('Workshop');
  await formField(page, 'PR Title').fill(title);

  const lineInputs = page.locator('.card-panel')
    .filter({ has: page.getByText('PR Lines', { exact: true }) })
    .locator('tbody tr').first().locator('input');
  await lineInputs.nth(0).fill('PR-E2E-GLOVES');
  await lineInputs.nth(1).fill(itemName);
  await lineInputs.nth(2).fill('10');
  await lineInputs.nth(3).fill('BOX');
  await lineInputs.nth(4).fill('1250');
  await lineInputs.nth(5).fill('WH-JKT');

  const createResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/requisitions`
      && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save As Draft', exact: true }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const requisition = await createResponse.json();

  await expect(page.getByRole('heading', { name: 'Detail Purchase Requisition' })).toBeVisible();
  await expect(page.getByText(requisition.prNumber, { exact: false })).toBeVisible();
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: itemName })).toContainText('10');

  const submitResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/requisitions/${requisition.id}/submit`
      && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit PR', exact: true }).click();
  expect((await submitResponsePromise).status()).toBe(200);
  await expect(page.getByText('SUBMITTED', { exact: true })).toBeVisible();

  const approveResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/requisitions/${requisition.id}/approve`
      && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Approve PR', exact: true }).click();
  expect((await approveResponsePromise).status()).toBe(200);
  await expect(page.getByText('APPROVED', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Purchase Requisitions', exact: true }).click();
  const requisitionRow = page.getByRole('row').filter({ hasText: requisition.prNumber });
  await expect(requisitionRow).toContainText(requesterName);
  await expect(requisitionRow).toContainText(title);
  await expect(requisitionRow).toContainText('APPROVED');
});

test('rejects a PO allocation greater than the approved PR quantity', async ({ page, request }) => {
  const requisition = await createApprovedRequisition(request);
  const line = requisition.lines[0];

  await page.goto('/purchase-orders/new');
  await page.getByLabel(`Select ${requisition.prNumber} line 1`, { exact: true }).check();
  await page.getByLabel('Vendor', { exact: true }).fill('PR Module Supplier');
  await page.getByLabel(`Order quantity for ${requisition.itemName}`, { exact: true }).fill('11');

  let purchaseOrderPosts = 0;
  page.on('request', (outgoing) => {
    if (outgoing.url() === `${apiUrl}/api/purchase-orders` && outgoing.method() === 'POST') {
      purchaseOrderPosts += 1;
    }
  });
  await page.getByRole('button', { name: 'Save As Draft', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    `${requisition.prNumber} line 1: allocation qty 11 exceeds remaining 10.`,
  );
  expect(purchaseOrderPosts).toBe(0);

  const apiResponse = await request.post(`${apiUrl}/api/purchase-orders`, {
    data: {
      vendorName: 'PR Module Supplier',
      lines: [{
        prLineId: line.id,
        itemCode: line.itemCode,
        itemName: line.itemName,
        uom: line.uom,
        siteCode: line.siteCode,
        unitPrice: line.estUnitPrice,
        qtyOrdered: 11,
      }],
    },
  });
  expect(apiResponse.status()).toBe(422);
  expect(await apiResponse.json()).toEqual({
    message: 'lines[0]: allocation qty 11 exceeds remaining 10',
  });

  const savedRequisitionResponse = await request.get(`${apiUrl}/api/requisitions/${requisition.id}`);
  expect(savedRequisitionResponse.status()).toBe(200);
  const savedRequisition = await savedRequisitionResponse.json();
  expect(savedRequisition.lines[0].id).toBe(line.id);
  expect(savedRequisition.lines[0].qtyAllocated).toBe(0);
  expect(savedRequisition.lines[0].qtyOpenForPo).toBe(10);
});