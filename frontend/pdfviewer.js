// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null,
    scale = 1.5,
    currentPdfUrl = '',
    currentPdfTitle = '';

const canvas = document.getElementById('pdf-canvas'),
      ctx = canvas.getContext('2d');

// Wait for DOM to be fully ready
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('pdf-modal');
    const closeBtn = document.getElementById('close-pdf-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            pdfDoc = null;
            pageNum = 1;
        });
    }

    document.getElementById('prev-page').addEventListener('click', () => {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPage(pageNum);
    });

    document.getElementById('next-page').addEventListener('click', () => {
        if (pageNum >= pdfDoc.numPages) return;
        pageNum++;
        queueRenderPage(pageNum);
    });

    document.getElementById('zoom-in').addEventListener('click', () => {
        scale += 0.25;
        queueRenderPage(pageNum);
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        if (scale <= 0.5) return;
        scale -= 0.25;
        queueRenderPage(pageNum);
    });

    document.getElementById('fullscreen').addEventListener('click', () => {
        const elem = document.querySelector('.pdf-viewer-container');
        if (elem.requestFullscreen) elem.requestFullscreen();
    });

    document.getElementById('download-pdf').addEventListener('click', () => {
        if (currentPdfUrl) {
            const a = document.createElement('a');
            a.href = currentPdfUrl;
            a.download = `${currentPdfTitle}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    });
});

// Global function to open PDF
window.initPDFViewer = async function(url, title) {
    currentPdfUrl = url;
    currentPdfTitle = title;
    document.getElementById('pdf-title').innerText = title;
    document.getElementById('pdf-modal').classList.remove('hidden');
    
    try {
        // Assuming the backend provides a direct URL or a proxy URL
        // If using Cloudinary, ensure the URL is accessible
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        document.getElementById('page-count').innerText = pdfDoc.numPages;
        pageNum = 1;
        queueRenderPage(pageNum);
    } catch (err) {
        console.error('Error loading PDF:', err);
        showToast('Failed to load PDF.', 'error');
    }
};

function queueRenderPage(num) {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
}

async function renderPage(num) {
    pageIsRendering = true;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale });
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: ctx,
        viewport
    };

    await page.render(renderContext).promise;
    pageIsRendering = false;

    if (pageNumIsPending !== null) {
        renderPage(pageNumIsPending);
        pageNumIsPending = null;
    }

    document.getElementById('page-num').innerText = num;
}
