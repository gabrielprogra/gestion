// Variables globales
let inventario = [];
let carrito = [];
let ventas = [];
let fuse; // Para la búsqueda difusa
let currentPage = 1;
const itemsPerPage = 11;

// Funciones de utilidad
function formatPrice(price) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

function parsePrice(priceString) {
    return parseFloat(priceString.replace(/[^\d.-]/g, ''));
}

// Función para inicializar Fuse.js (búsqueda difusa)
function initializeFuse() {
    const options = {
        keys: ['codigo', 'producto', 'marca', 'rubro'],
        threshold: 0.4,
        ignoreLocation: true
    };
    fuse = new Fuse(inventario, options);
}

// Navegación
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector('section.active').classList.remove('active');
        document.querySelector(this.getAttribute('href')).classList.add('active');
        document.querySelector('nav a.active').classList.remove('active');
        this.classList.add('active');
    });
});

// Búsqueda de productos
function buscarProductos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm.length < 2) {
        document.getElementById('searchSuggestions').innerHTML = '';
        document.getElementById('searchSuggestions').classList.remove('active');
        mostrarResultados([]);
        return;
    }

    const resultados = fuse.search(searchTerm);
    mostrarSugerencias(resultados.slice(0, 5)); // Muestra las primeras 5 sugerencias
    mostrarResultados(resultados.map(r => r.item));
}

// Función para mostrar sugerencias
function mostrarSugerencias(sugerencias) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    suggestionsContainer.innerHTML = '';

    if (sugerencias.length > 0) {
        suggestionsContainer.classList.add('active');
    } else {
        suggestionsContainer.classList.remove('active');
    }

    sugerencias.forEach(sugerencia => {
        const div = document.createElement('div');
        div.innerHTML = resaltarCoincidencias(sugerencia.item.producto, document.getElementById('searchInput').value);
        div.addEventListener('click', () => {
            document.getElementById('searchInput').value = sugerencia.item.producto;
            buscarProductos();
            suggestionsContainer.classList.remove('active');
        });
        suggestionsContainer.appendChild(div);
    });
}

// Función para resaltar coincidencias
function resaltarCoincidencias(texto, busqueda) {
    const escapedBusqueda = busqueda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedBusqueda, 'gi');
    return texto.replace(regex, match => `<mark>${match}</mark>`);
}

function mostrarResultados(resultados) {
    const totalProductos = resultados.length;
    const totalPages = Math.ceil(totalProductos / itemsPerPage);
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = resultados.slice(startIndex, endIndex);

    const tbody = document.querySelector('#resultadosBusqueda tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    paginatedResults.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${resaltarCoincidencias(item.codigo.toString(), document.getElementById('searchInput').value)}</td>
            <td>${resaltarCoincidencias(item.producto, document.getElementById('searchInput').value)}</td>
            <td>${resaltarCoincidencias(item.marca, document.getElementById('searchInput').value)}</td>
            <td>${resaltarCoincidencias(item.rubro, document.getElementById('searchInput').value)}</td>
            <td>${formatPrice(item.precioVenta)}</td>
            <td><input type="number" min="0" step="0.01" value="1" class="cantidadInput"></td>
            <td><button class="agregarCarrito"><i class="fas fa-cart-plus"></i></button></td>
        `;
        const cantidadInput = tr.querySelector('.cantidadInput');
        const agregarButton = tr.querySelector('.agregarCarrito');
        
        if (cantidadInput && agregarButton) {
            agregarButton.addEventListener('click', function() {
                const cantidad = parseFloat(cantidadInput.value);
                agregarAlCarrito(item, cantidad);
                cantidadInput.value = "1"; // Resetear la cantidad a 1
                mostrarModal("Producto agregado correctamente");
            });
        }
        tbody.appendChild(tr);
    });

    actualizarPaginacion(totalProductos, totalPages);
}

function actualizarPaginacion(totalProductos, totalPages) {
    const paginationButtons = document.getElementById('paginationButtons');
    const totalProductosSpan = document.getElementById('totalProductos');

    totalProductosSpan.textContent = `${totalProductos} productos`;

    paginationButtons.innerHTML = '';

    // Botón "Primera página"
    const firstPageButton = document.createElement('button');
    firstPageButton.innerHTML = '<i class="fas fa-angle-double-left"></i>';
    firstPageButton.addEventListener('click', () => cambiarPagina(1));
    firstPageButton.disabled = currentPage === 1;
    paginationButtons.appendChild(firstPageButton);

    // Botón "Página anterior"
    const prevPageButton = document.createElement('button');
    prevPageButton.innerHTML = '<i class="fas fa-angle-left"></i>';
    prevPageButton.addEventListener('click', () => cambiarPagina(currentPage - 1));
    prevPageButton.disabled = currentPage === 1;
    paginationButtons.appendChild(prevPageButton);

    // Botones de páginas
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => cambiarPagina(i));
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        paginationButtons.appendChild(pageButton);
    }

    // Botón "Página siguiente"
    const nextPageButton = document.createElement('button');
    nextPageButton.innerHTML = '<i class="fas fa-angle-right"></i>';
    nextPageButton.addEventListener('click', () => cambiarPagina(currentPage + 1));
    nextPageButton.disabled = currentPage === totalPages;
    paginationButtons.appendChild(nextPageButton);

    // Botón "Última página"
    const lastPageButton = document.createElement('button');
    lastPageButton.innerHTML = '<i class="fas fa-angle-double-right"></i>';
    lastPageButton.addEventListener('click', () => cambiarPagina(totalPages));
    lastPageButton.disabled = currentPage === totalPages;
    paginationButtons.appendChild(lastPageButton);
}

function cambiarPagina(newPage) {
    currentPage = newPage;
    buscarProductos();
}

// Carrito de compras
function agregarAlCarrito(item, cantidad) {
    const itemEnCarrito = carrito.find(i => i.codigo === item.codigo);
    if (itemEnCarrito) {
        itemEnCarrito.cantidad += cantidad;
    } else {
        carrito.push({...item, cantidad, descuento: 0});
    }
    actualizarCarrito();
}

function actualizarCarrito() {
    const tbody = document.querySelector('#carritoTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    let total = 0;
    carrito.forEach(item => {
        const subtotal = item.precioVenta * item.cantidad * (1 - item.descuento / 100);
        total += subtotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.producto}</td>
            <td>${formatPrice(item.precioVenta)}</td>
            <td><input type="number" min="0" step="0.01" value="${item.cantidad}" class="cantidadInput"></td>
            <td><input type="number" min="0" max="100" value="${item.descuento}" class="descuentoInput"></td>
            <td>${formatPrice(subtotal)}</td>
            <td><button class="eliminarDelCarrito">Eliminar</button></td>
        `;
        
        const cantidadInput = tr.querySelector('.cantidadInput');
        const descuentoInput = tr.querySelector('.descuentoInput');
        const eliminarButton = tr.querySelector('.eliminarDelCarrito');
        
        if (cantidadInput) {
            cantidadInput.addEventListener('change', function() {
                item.cantidad = parseFloat(this.value);
                actualizarCarrito();
            });
        }
        
        if (descuentoInput) {
            descuentoInput.addEventListener('change', function() {
                item.descuento = parseFloat(this.value);
                actualizarCarrito();
            });
        }
        
        if (eliminarButton) {
            eliminarButton.addEventListener('click', function() {
                carrito = carrito.filter(i => i.codigo !== item.codigo);
                actualizarCarrito();
            });
        }
        
        tbody.appendChild(tr);
    });
    
    const totalElement = document.getElementById('totalCarrito');
    if (totalElement) {
        totalElement.textContent = formatPrice(total);
    }
}

document.getElementById('confirmarCompra').addEventListener('click', function() {
    if (carrito.length === 0) {
        mostrarModal('El carrito está vacío');
        return;
    }
    const fecha = new Date().toISOString().split('T')[0];
    carrito.forEach(item => {
        ventas.push({
            fecha,
            ...item,
            total: item.precioVenta * item.cantidad * (1 - item.descuento / 100)
        });
    });
    carrito = [];
    actualizarCarrito();
    mostrarModal('Compra confirmada');
    mostrarVentas(ventas);
});

// Generar Presupuesto
document.getElementById('generarPresupuesto').addEventListener('click', function() {
    if (carrito.length === 0) {
        mostrarModal('El carrito está vacío');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Presupuesto', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 32);
    
    const columns = ['Código', 'Producto', 'Cantidad', 'Precio', 'Descuento', 'Subtotal'];
    const data = carrito.map(item => [
        item.codigo,
        item.producto,
        item.cantidad,
        formatPrice(item.precioVenta),
        `${item.descuento}%`,
        formatPrice(item.precioVenta * item.cantidad * (1 - item.descuento / 100))
    ]);
    
    const total = carrito.reduce((sum, item) => sum + item.precioVenta * item.cantidad * (1 - item.descuento / 100), 0);
    data.push(['', '', '', '', 'Total:', formatPrice(total)]);
    
    doc.autoTable({
        head: [columns],
        body: data,
        startY: 40,
    });
    
    const notaY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text('Nota: Los precios pueden sufrir actualización sin previo aviso.', 14, notaY);
    doc.text('Métodos de pago aceptados:', 14, notaY + 6);
    doc.text('- Efectivo', 20, notaY + 12);
    doc.text('- Transferencia', 20, notaY + 18);
    doc.text('- Pagos por QR (compatible con todos los bancos y billeteras virtuales)', 20, notaY + 24);
    doc.text('- Tarjeta de crédito', 20, notaY + 30);
    doc.text('- Tarjeta de débito', 20, notaY + 36);
    doc.text('- Tarjeta Naranja (solo en una cuota)', 20, notaY + 42);
    
    doc.save('Presupuesto.pdf');
});

// Enviar por WhatsApp
document.getElementById('enviarWhatsapp').addEventListener('click', function() {
    if (carrito.length === 0) {
        mostrarModal('El carrito está vacío');
        return;
    }
    
    const phoneNumber = document.getElementById('whatsappNumber').value;
    if (!phoneNumber) {
        mostrarModal('Por favor, ingrese un número de teléfono');
        return;
    }
    
    const hora = new Date().getHours();
    let saludo;
    if (hora < 12) {
        saludo = "Buenos días";
    } else if (hora < 18) {
        saludo = "Buenas tardes";
    } else {
        saludo = "Buenas noches";
    }
    
    let message = `${saludo}! Gracias por su interés en nuestros productos. `;
    message += 'Los precios pueden sufrir actualización sin previo aviso. ';
    message += 'Aceptamos los siguientes métodos de pago: efectivo, transferencia, pagos por QR (compatible con todos los bancos y billeteras virtuales), tarjeta de crédito, tarjeta de débito y Tarjeta Naranja (solo en una cuota). ';
    message += '¿En qué puedo ayudarle?';
    
    const whatsappUrl = `https://wa.me/+549${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
});

// Inventario
document.getElementById('cargarInventario').addEventListener('click', function() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                inventario = XLSX.utils.sheet_to_json(firstSheet, {header: ['codigo', 'producto', 'costo', 'margenRe', 'precioVenta', 'marca', 'rubro', 'deposito']});
                inventario.shift(); // Eliminar la fila de encabezados
                mostrarInventario();
                initializeFuse(); // Inicializar Fuse.js con el nuevo inventario
              mostrarModal('Inventario cargado exitosamente');
            } catch (error) {
                console.error('Error al procesar el archivo:', error);
                mostrarModal('Error al cargar el inventario. Por favor, verifica el formato del archivo.');
            }
        };
        reader.onerror = function() {
            mostrarModal('Error al leer el archivo');
        };
        reader.readAsArrayBuffer(file);
    } else {
        mostrarModal('Por favor, seleccione un archivo');
    }
});

function mostrarInventario() {
    const tbody = document.querySelector('#inventarioTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    inventario.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.producto}</td>
            <td>${formatPrice(item.costo)}</td>
            <td>${item.margenRe}%</td>
            <td>${formatPrice(item.precioVenta)}</td>
            <td>${item.marca}</td>
            <td>${item.rubro}</td>
            <td>${item.deposito}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Registro de ventas
document.getElementById('filtrarVentas').addEventListener('click', function() {
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;
    const ventasFiltradas = ventas.filter(v => v.fecha >= fechaDesde && v.fecha <= fechaHasta);
    mostrarVentas(ventasFiltradas);
});

function mostrarVentas(ventasMostrar) {
    const tbody = document.querySelector('#registroVentas tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    ventasMostrar.forEach(venta => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${venta.fecha}</td>
            <td>${venta.codigo}</td>
            <td>${venta.producto}</td>
            <td>${venta.cantidad}</td>
            <td>${formatPrice(venta.precioVenta)}</td>
            <td>${venta.descuento}%</td>
            <td>${formatPrice(venta.total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Descargar Excel
document.getElementById('descargarExcel').addEventListener('click', function() {
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;
    const ventasFiltradas = ventas.filter(v => v.fecha >= fechaDesde && v.fecha <= fechaHasta);
    
    if (ventasFiltradas.length === 0) {
        mostrarModal('No hay ventas para exportar en el rango de fechas seleccionado');
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(ventasFiltradas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    
    // Generar el archivo Excel
    XLSX.writeFile(wb, `Ventas_${fechaDesde}_${fechaHasta}.xlsx`);
});

// Función de debounce para evitar búsquedas excesivas
function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    }
}

// Función para mostrar el modal
function mostrarModal(mensaje) {
    const modal = document.getElementById('modal');
    const modalContent = modal.querySelector('.modal-content');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.textContent = mensaje;
    modal.classList.add('show');
    setTimeout(() => {
        modal.classList.remove('show');
    }, 1000); // Duración de 1 segundo
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar la sección de ventas por defecto
    const ventasSection = document.querySelector('#ventas');
    if (ventasSection) {
        ventasSection.classList.add('active');
    }
    
    // Establecer la fecha de hoy como valor predeterminado para los campos de fecha
    const today = new Date().toISOString().split('T')[0];
    const fechaDesdeInput = document.getElementById('fechaDesde');
    const fechaHastaInput = document.getElementById('fechaHasta');
    if (fechaDesdeInput) fechaDesdeInput.value = today;
    if (fechaHastaInput) fechaHastaInput.value = today;

    // Configurar el evento de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1; // Resetear a la primera página en cada nueva búsqueda
            buscarProductos();
        }, 300));
    }

    // Ocultar sugerencias al hacer clic fuera de ellas
    document.addEventListener('click', function(event) {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(event.target)) {
            suggestionsContainer.classList.remove('active');
        }
    });

    // Cerrar el modal al hacer clic fuera de él
    const modal = document.getElementById('modal');
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
});