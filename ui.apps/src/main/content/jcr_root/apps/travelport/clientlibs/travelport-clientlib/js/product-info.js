// --- Dynamic Product Fetching ---
const fetchProducts = async (locationType) => {

    try {
        const response = await fetch(`/bin/products?location=${locationType}`);
        const data = await response.json();
        console.log(data,"testing")
        if (data.products) {
            return data.products.map(p => ({
                name: p.product_name,
                rate: p.rack_rate,
                type: p.product_type
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
};

const getProductOptions = async (locationType) => {
    const products = await fetchProducts(locationType);
    return products.map(p => 
        `<option value="${p.name}|${p.rate}|${p.type}">${p.name} (${p.type})</option>`
    ).join('');
};

// --- Helper function to format currency ---
const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '0.00';
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};


// --- Core Calculation Logic ---
const calculateRow = (row) => {
    const quantityInput = row.querySelector('.input-quantity');
    const discountInput = row.querySelector('.input-discount');
    const rackRateElement = row.querySelector('.input-rack-rate');
    const totalAfterDiscountElement = row.querySelector('.total-after-discount');

    const quantity = parseFloat(quantityInput.value || 0);
    let discountPercent = parseFloat(discountInput.value || 0);
    const rackRate = parseFloat(quantityInput.dataset.rackRate || 0);

    if (discountPercent > 100) {
        discountPercent = 100;
        discountInput.value = 100;
    }

    const discountMultiplier = 1 - (discountPercent / 100);
    const totalAfterDiscount = (rackRate * quantity) * discountMultiplier;

    totalAfterDiscountElement.textContent = formatCurrency(totalAfterDiscount);

    return {
        rackTotal: rackRate * quantity,
        discountedTotal: totalAfterDiscount,
    };
};

const calculateLocationTotals = (tableId, totalDiscountPercentId, totalAfterDiscountId) => {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('.table-row');
    let totalRackValue = 0;
    let totalDiscountedValue = 0;
    let maxDiscount = 0;

    rows.forEach(row => {
        const results = calculateRow(row);
        totalRackValue += results.rackTotal;
        totalDiscountedValue += results.discountedTotal;

        const discountInput = row.querySelector('.input-discount');
        const discountPercent = parseFloat(discountInput.value || 0);
        if (discountPercent > maxDiscount) maxDiscount = discountPercent;
    });

    const totalDiscount = totalRackValue > 0 ? ((totalRackValue - totalDiscountedValue) / totalRackValue) * 100 : 0;

    document.getElementById(totalDiscountPercentId).textContent = formatCurrency(totalDiscount) + '%';
    document.getElementById(totalAfterDiscountId).textContent = '£' + formatCurrency(totalDiscountedValue);

    return { totalRackValue, totalDiscountedValue, maxDiscount };
};

const calculateTotals = () => {
    const homeTotals = calculateLocationTotals('home-product-table', 'home-total-discount-percent', 'home-total-after-discount');
    const branchTotals = calculateLocationTotals('branch-product-table', 'branch-total-discount-percent', 'branch-total-after-discount');

    const totalRackValue = homeTotals.totalRackValue + branchTotals.totalRackValue;
    const totalDiscountedValue = homeTotals.totalDiscountedValue + branchTotals.totalDiscountedValue;
    const maxIndividualDiscount = Math.max(homeTotals.maxDiscount, branchTotals.maxDiscount);

    const blendedDiscount = totalRackValue > 0 ? ((totalRackValue - totalDiscountedValue) / totalRackValue) * 100 : 0;
    document.getElementById('blended-discount').textContent = formatCurrency(blendedDiscount) + '%';

    const alertBox = document.getElementById('workflow-alert');
    if (maxIndividualDiscount > 80 || blendedDiscount > 60) {
        alertBox.classList.remove('hidden');
        let message = "⚠️ **Workflow Alert:** ";
        if (maxIndividualDiscount > 80) {
            message += "Individual Product Discount (" + formatCurrency(maxIndividualDiscount) + "%) exceeds 80%. **Routing to Approver 1.** ";
        }
        if (blendedDiscount > 60) {
            message += "Blended Total Discount (" + formatCurrency(blendedDiscount) + "%) exceeds 60%. **Routing to Approver 1, then Approver 2.**";
        }
        alertBox.querySelector('p').innerHTML = message;
    } else {
        alertBox.classList.add('hidden');
    }
};

// --- Dynamic Form Row Logic ---
const addRowWithProduct = (tableId, product) => {
    const tableBody = document.getElementById(tableId);
    const newRow = document.createElement('tr');
    newRow.classList.add('table-row');

    const isFixed = product.type === 'FIXED';

    newRow.innerHTML = `
        <td>
            <select class="input-product-name" onchange="updateRow(this)">
                <option value="${product.name}|${product.rate}|${product.type}" selected>
                    ${product.name} (${product.type})
                </option>
            </select>
        </td>
        <td><input type="number" value="1" min="1" class="text-center input-quantity" data-rack-rate="${product.rate}" data-fixed="${isFixed}" ${!isFixed ? 'readonly' : ''} oninput="calculateTotals()"></td>
        <td class="text-right read-only input-rack-rate">${formatCurrency(product.rate)}</td>
        <td><input type="number" min="0" max="100" value="0" class="text-center input-discount" oninput="calculateTotals()"></td>
        <td class="text-right font-semibold total-after-discount">0.00</td>
        <td><button onclick="removeRow(this)" class="text-red-600 hover:text-red-800 font-medium">Remove</button></td>
    `;

    tableBody.appendChild(newRow);
    calculateTotals();
};


const addRow = async (tableId, locationType) => {
    const tableBody = document.getElementById(tableId);
    const optionsHtml = await getProductOptions(locationType);

    const newRow = document.createElement('tr');
    newRow.classList.add('table-row');

    newRow.innerHTML = `
        <td>
            <select class="input-product-name" onchange="updateRow(this)">
                <option value="">Select Product...</option>
                ${optionsHtml}
            </select>
        </td>
        <td><input type="number" value="1" min="1" class="text-center input-quantity" data-rack-rate="0" data-fixed="false" oninput="calculateTotals()"></td>
        <td class="text-right read-only input-rack-rate">0.00</td>
        <td><input type="number" min="0" max="100" value="0" class="text-center input-discount" oninput="calculateTotals()"></td>
        <td class="text-right font-semibold total-after-discount">0.00</td>
        <td><button onclick="removeRow(this)" class="text-red-600 hover:text-red-800 font-medium">Remove</button></td>
    `;
    tableBody.appendChild(newRow);
    calculateTotals();
};



const removeRow = (button) => {
    const row = button.closest('tr');
    row.remove();
    calculateTotals();
};

const updateRow = (selectElement) => {
    const row = selectElement.closest('tr');
    const parts = selectElement.value.split('|');

    if (parts.length === 3) {
        const [name, rateStr, type] = parts;
        const rackRate = parseFloat(rateStr);
        const isFixed = type.toUpperCase() === "FIXED";

        const quantityInput = row.querySelector('.input-quantity');
        const rackRateElement = row.querySelector('.input-rack-rate');

        quantityInput.dataset.rackRate = rackRate;
        quantityInput.dataset.fixed = isFixed;
        rackRateElement.textContent = formatCurrency(rackRate);

        if (isFixed) {
            quantityInput.removeAttribute('readonly');
            quantityInput.classList.remove('read-only');
        } else {
            quantityInput.setAttribute('readonly', 'true');
            quantityInput.classList.add('read-only');
            quantityInput.value = 1;
        }
    } else {
        row.querySelector('.input-quantity').dataset.rackRate = 0;
        row.querySelector('.input-rack-rate').textContent = '0.00';
    }
    calculateTotals();
};


const collectTableData = (tableId) => {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('.table-row');

    const data = Array.from(rows).map(row => {
        const productSelect = row.querySelector('.input-product-name');
        const quantityInput = row.querySelector('.input-quantity');
        const rackRateElement = row.querySelector('.input-rack-rate');
        const discountInput = row.querySelector('.input-discount');
        const totalAfterDiscountElement = row.querySelector('.total-after-discount');

        // Split the select value if product selected
        let name = '', type = '', rate = 0;
        if (productSelect.value) {
            const parts = productSelect.value.split('|');
            name = parts[0];
            rate = parseFloat(parts[1]) || 0;
            type = parts[2];
        }

        return {
            product_name: name,
            product_type: type,
            quantity: parseFloat(quantityInput.value || 0),
            rack_rate: rate,
            discount_percent: parseFloat(discountInput.value || 0),
            total_after_discount: parseFloat(totalAfterDiscountElement.textContent.replace(/,/g, '')) || 0
        };
    });

    return data;
};

const getCsrfToken = async () => {
    const response = await fetch("/libs/granite/csrf/token.json", {
        credentials: "include"
    });
    const data = await response.json();
    return data.token;
};


const submitForm = async () => {
    const homeData = collectTableData('home-product-table');
    const branchData = collectTableData('branch-product-table');
    const csrfToken = await getCsrfToken();

    const payload = {
         page_path: window.location.pathname,
         products : {
			home_products: homeData,
        	branch_products: branchData
		}
    };

    try {
        const response = await fetch('/bin/form/save', {
            method: 'POST',
            headers: {
                "CSRF-Token": csrfToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('Form submitted successfully!');
            const data = await response.json();
            console.log(data,"formresponse");
            const redirectUrl = `/content/travelport/us/en/submitted-data.html?pagePath=${window.location.pathname}&id=${data.id}`;
			console.log("Redirecting to:", redirectUrl);
            window.location.href = redirectUrl;
            
        } else {
            const text = await response.text();
            console.error('Error submitting form:', text);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};


const saveForm = async () => {
    const homeData = collectTableData('home-product-table');
    const branchData = collectTableData('branch-product-table');
    const csrfToken = await getCsrfToken();

    const urlParams = new URLSearchParams(window.location.search);
    const pagePath = urlParams.get("pagePath");
    const id = urlParams.get("id");

    const servletUrl = `/bin/form/save?pagePath=${pagePath}&id=${id}`;

    const payload = {
        page_path: pagePath,
        id: id,
        products: {
            home_products: homeData,
            branch_products: branchData
        }
    };

    try {
        const response = await fetch(servletUrl, {
            method: 'PUT',
            headers: {
                "CSRF-Token": csrfToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("Form saved successfully!");
			const data = await response.json();
            console.log(data,"formresponse");
            const redirectUrl = `/content/travelport/us/en/submitted-data.html?pagePath=${window.location.pathname}&id=${data.id}`;
			console.log("Redirecting to:", redirectUrl);
            window.location.href = redirectUrl;
        } else {
            console.error("Save error:", await response.text());
        }
    } catch (error) {
        console.error("Save Exception:", error);
    }
};


// --- Initial Setup ---
window.onload = async () => {
    calculateTotals();

    // Read query params
    const urlParams = new URLSearchParams(window.location.search);
    const pagePath = urlParams.get("pagePath");
    const id = urlParams.get("id");

    // ONLY add default H4 when NOT in edit mode
    if (!pagePath && !id) {
        const products = await fetchProducts('HOME');
        const defaultH4 = products.find(p => p.name === 'H4');
        if (defaultH4) {
            addRowWithProduct('home-product-table', defaultH4);
        }
    }

    const mandatoryRow = document.querySelector('.mandatory-row');
    if (mandatoryRow) {
        mandatoryRow.querySelector('.input-discount').addEventListener('input', calculateTotals);
    }

    const branchSampleRow = document.querySelector('#branch-product-table .table-row');
    if (branchSampleRow) {
        branchSampleRow.querySelector('.input-discount').addEventListener('input', calculateTotals);
    }
};


document.addEventListener("DOMContentLoaded", async function () {
    const urlParams = new URLSearchParams(window.location.search);
        const pagePath = urlParams.get("pagePath");
        const id = urlParams.get("id");


     const submitBtn = document.getElementById("submitBtn");
    const saveBtn = document.getElementById("saveBtn");

    if (id) {
        // Editing scenario
        submitBtn.style.display = "none";
        saveBtn.style.display = "inline-block";
    } else {
        // New Form scenario
        submitBtn.style.display = "inline-block";
        saveBtn.style.display = "none";
    }


    const servletUrl = `/bin/form/save?pagePath=${pagePath}&id=${id}`;
   const response = await fetch(servletUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
    console.log("Loaded data:", data);

    // Fill fields
    if (document.querySelector("#customerName")) {
        document.querySelector("#customerName").value = data.submittedBy || "";
    }

    // Clear existing rows
    document.getElementById("home-product-table").innerHTML = "";
    document.getElementById("branch-product-table").innerHTML = "";

    // Populate tables
    populateProductsTable("home-product-table", data.data.home_products);
    populateProductsTable("branch-product-table", data.data.branch_products);

    calculateTotals();
});

/* Helper for edit mode */
function populateProductsTable(tableId, products) {
    const table = document.getElementById(tableId);
    products.forEach(p => {
        const row = document.createElement("tr");
        row.classList.add("table-row");

        row.innerHTML = `
            <td>
                <select class="input-product-name">
                    <option selected value="${p.product_name}|${p.rack_rate}|${p.product_type}">
                        ${p.product_name} (${p.product_type})
                    </option>
                </select>
            </td>
            <td><input type="number" value="${p.quantity}" class="input-quantity" data-rack-rate="${p.rack_rate}" oninput="calculateTotals()"></td>
            <td class="input-rack-rate text-right">${formatCurrency(p.rack_rate)}</td>
            <td><input type="number" value="${p.discount_percent}" class="input-discount" oninput="calculateTotals()"></td>
            <td class="total-after-discount text-right">${formatCurrency(p.total_after_discount)}</td>
            <td><button onclick="removeRow(this)">Remove</button></td>
        `;

        table.appendChild(row);
    });
}