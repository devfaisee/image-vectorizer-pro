// -------------------------------------------------------------
// Smart PNG/JPG Vectorizer Pro - Core Controller & Tracing Engine
// -------------------------------------------------------------

// Active State
const state = {
  originalImage: null,
  imageName: "photo.png",
  origWidth: 0,
  origHeight: 0,
  
  // Custom Controls
  preset: "default", // default, flat, silhouette, posterized
  colorsCount: 8,
  monoThreshold: 128,
  blurRadius: 0,
  noiseFilter: 8,
  curvePrecision: 4,
  
  activeTab: "split", // split, vector
  tracedSvgXml: "", // Stores current computed vector XML
  isTracing: false
};

// DOM References
let elDropZone, elFileInput, elThumbnail, elImgName, elImgDims, elBtnRemove;
let elPresetSelect, elColorsGroup, elColorsSlider, elColorsVal;
let elMonoGroup, elMonoSlider, elMonoVal;
let elBlurSlider, elBlurVal;
let elNoiseSlider, elNoiseVal;
let elCurveSlider, elCurveVal;
let elViewportPlaceholder, elDoubleViewport, elSourcePreview, elVectorOutput;
let elBtnReset, elBtnCopy, elBtnDownload;
let elProcessingOverlay;
let elHiddenCanvas;

document.addEventListener("DOMContentLoaded", () => {
  cacheDomElements();
  bindEventHandlers();
});

function cacheDomElements() {
  elDropZone = document.getElementById("drop-zone");
  elFileInput = document.getElementById("file-input");
  elThumbnail = document.getElementById("thumbnail-wrapper");
  elImgName = document.getElementById("img-name");
  elImgDims = document.getElementById("img-dims");
  elBtnRemove = document.getElementById("btn-remove-image");
  
  elPresetSelect = document.getElementById("preset-select");
  elColorsGroup = document.getElementById("group-colors-count");
  elColorsSlider = document.getElementById("range-colors-count");
  elColorsVal = document.getElementById("val-colors-count");
  
  elMonoGroup = document.getElementById("group-mono-threshold");
  elMonoSlider = document.getElementById("range-mono-threshold");
  elMonoVal = document.getElementById("val-mono-threshold");
  
  elBlurSlider = document.getElementById("range-blur-radius");
  elBlurVal = document.getElementById("val-blur-radius");
  elNoiseSlider = document.getElementById("range-noise-filter");
  elNoiseVal = document.getElementById("val-noise-filter");
  elCurveSlider = document.getElementById("range-curve-precision");
  elCurveVal = document.getElementById("val-curve-precision");
  
  elViewportPlaceholder = document.getElementById("editor-placeholder");
  elDoubleViewport = document.getElementById("double-viewport-split");
  elSourcePreview = document.getElementById("source-preview");
  elVectorOutput = document.getElementById("vector-output-wrapper");
  
  elBtnReset = document.getElementById("btn-reset");
  elBtnCopy = document.getElementById("btn-copy-code");
  elBtnDownload = document.getElementById("btn-download");
  elProcessingOverlay = document.getElementById("processing-overlay");
  
  elHiddenCanvas = document.getElementById("hidden-source-canvas");
}

function bindEventHandlers() {
  
  // Drag Drop zone triggers
  elDropZone.addEventListener("click", () => elFileInput.click());
  elFileInput.addEventListener("change", handleFileSelect);
  
  elDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    elDropZone.classList.add("dragover");
  });
  
  elDropZone.addEventListener("dragleave", () => {
    elDropZone.classList.remove("dragover");
  });
  
  elDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    elDropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      elFileInput.files = e.dataTransfer.files;
      handleFileSelect();
    }
  });

  elBtnRemove.addEventListener("click", resetWorkspace);
  elBtnReset.addEventListener("click", resetFineTunes);

  // Preset Select Listener
  elPresetSelect.addEventListener("change", handlePresetChange);

  // Parameter Sliders Listeners
  elColorsSlider.addEventListener("input", (e) => {
    state.colorsCount = parseInt(e.target.value);
    elColorsVal.textContent = `${state.colorsCount} colors`;
    triggerVectorTracingPipeline();
  });

  elMonoSlider.addEventListener("input", (e) => {
    state.monoThreshold = parseInt(e.target.value);
    elMonoVal.textContent = state.monoThreshold;
    triggerVectorTracingPipeline();
  });

  elBlurSlider.addEventListener("input", (e) => {
    state.blurRadius = parseInt(e.target.value);
    elBlurVal.textContent = `${state.blurRadius}px`;
    triggerVectorTracingPipeline();
  });

  elNoiseSlider.addEventListener("input", (e) => {
    state.noiseFilter = parseInt(e.target.value);
    // Qualitative text
    let txt = "High Cleanup";
    if (state.noiseFilter < 4) txt = "None (Specks)";
    else if (state.noiseFilter < 8) txt = "Low Specks";
    else if (state.noiseFilter > 12) txt = "Aggressive";
    elNoiseVal.textContent = txt;
    triggerVectorTracingPipeline();
  });

  elCurveSlider.addEventListener("input", (e) => {
    state.curvePrecision = parseInt(e.target.value);
    let txt = "High (Smooth)";
    if (state.curvePrecision === 1) txt = "Low (Simple)";
    else if (state.curvePrecision === 2) txt = "Medium";
    else if (state.curvePrecision === 3) txt = "Balanced";
    else if (state.curvePrecision === 5) txt = "Perfect (Sharp)";
    elCurveVal.textContent = txt;
    triggerVectorTracingPipeline();
  });

  // Tab buttons triggers
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const tab = btn.dataset.tab;
      state.activeTab = tab;
      
      if (tab === "vector") {
        elDoubleViewport.classList.add("full-mode");
      } else {
        elDoubleViewport.classList.remove("full-mode");
      }
    });
  });

  // Action Buttons
  elBtnCopy.addEventListener("click", copySvgXmlToClipboard);
  elBtnDownload.addEventListener("click", triggerDownloadSvgFile);
}

// --- Image Loading Handler ---
function handleFileSelect() {
  const file = elFileInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Unsupported File: Please choose an image format (PNG, JPG, WebP).");
    return;
  }

  state.imageName = file.name;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.originalImage = img;
      setupWorkspace(img, e.target.result);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setupWorkspace(img, base64Url) {
  state.origWidth = img.naturalWidth;
  state.origHeight = img.naturalHeight;

  // Render Source Preview
  elSourcePreview.src = base64Url;

  // Set sizing parameters for hidden analyzer canvas
  elHiddenCanvas.width = state.origWidth;
  elHiddenCanvas.height = state.origHeight;
  const ctx = elHiddenCanvas.getContext("2d");
  ctx.drawImage(img, 0, 0, state.origWidth, state.origHeight);

  // Update UI Panels
  elDropZone.style.display = "none";
  elThumbnail.style.display = "flex";
  elImgName.textContent = state.imageName;
  elImgDims.textContent = `${state.origWidth} x ${state.origHeight} px`;
  
  elViewportPlaceholder.style.display = "none";
  elDoubleViewport.style.display = "grid";
  
  elBtnReset.disabled = false;
  elBtnCopy.disabled = false;
  elBtnDownload.disabled = false;

  // Run initial vectorization
  triggerVectorTracingPipeline();
}

function resetWorkspace() {
  state.originalImage = null;
  elFileInput.value = "";
  
  elDropZone.style.display = "flex";
  elThumbnail.style.display = "none";
  elViewportPlaceholder.style.display = "flex";
  elDoubleViewport.style.display = "none";
  
  elBtnReset.disabled = true;
  elBtnCopy.disabled = true;
  elBtnDownload.disabled = true;
  
  elVectorOutput.innerHTML = "";
  state.tracedSvgXml = "";
}

function resetFineTunes() {
  elPresetSelect.value = "default";
  handlePresetChange();
}

// --- Preset Configuration Managers ---
function handlePresetChange() {
  state.preset = elPresetSelect.value;

  // Default values mapping
  if (state.preset === "default") {
    state.colorsCount = 8;
    state.blurRadius = 0;
    state.noiseFilter = 8;
    state.curvePrecision = 4;
    
    elColorsGroup.style.display = "block";
    elMonoGroup.style.display = "none";
  } 
  else if (state.preset === "flat") {
    state.colorsCount = 4;
    state.blurRadius = 1;
    state.noiseFilter = 12; // High Cleanup
    state.curvePrecision = 2; // Medium
    
    elColorsGroup.style.display = "block";
    elMonoGroup.style.display = "none";
  } 
  else if (state.preset === "silhouette") {
    state.colorsCount = 2;
    state.blurRadius = 0;
    state.noiseFilter = 6;
    state.curvePrecision = 5; // Perfect Sharp
    state.monoThreshold = 128;
    
    elColorsGroup.style.display = "none";
    elMonoGroup.style.display = "block";
  } 
  else if (state.preset === "posterized") {
    state.colorsCount = 16;
    state.blurRadius = 0;
    state.noiseFilter = 3; // Specks kept
    state.curvePrecision = 4;
    
    elColorsGroup.style.display = "block";
    elMonoGroup.style.display = "none";
  }

  // Update input values on sliders
  elColorsSlider.value = state.colorsCount;
  elColorsVal.textContent = `${state.colorsCount} colors`;
  
  elMonoSlider.value = state.monoThreshold;
  elMonoVal.textContent = state.monoThreshold;
  
  elBlurSlider.value = state.blurRadius;
  elBlurVal.textContent = `${state.blurRadius}px`;
  
  elNoiseSlider.value = state.noiseFilter;
  let noiseTxt = "High Cleanup";
  if (state.noiseFilter < 4) noiseTxt = "None (Specks)";
  else if (state.noiseFilter < 8) noiseTxt = "Low Specks";
  else if (state.noiseFilter > 12) noiseTxt = "Aggressive";
  elNoiseVal.textContent = noiseTxt;
  
  elCurveSlider.value = state.curvePrecision;
  let precTxt = "High (Smooth)";
  if (state.curvePrecision === 1) precTxt = "Low (Simple)";
  else if (state.curvePrecision === 2) precTxt = "Medium";
  else if (state.curvePrecision === 3) precTxt = "Balanced";
  else if (state.curvePrecision === 5) precTxt = "Perfect (Sharp)";
  elCurveVal.textContent = precTxt;

  // Run pipeline
  triggerVectorTracingPipeline();
}

// --- Vectorization Computation Pipeline ---
function triggerVectorTracingPipeline() {
  if (!state.originalImage || state.isTracing) return;

  state.isTracing = true;
  elProcessingOverlay.style.display = "flex";

  // Defer execution slightly to let UI overlay show smooth spinner loading state
  setTimeout(() => {
    try {
      // 1. Check if we need to pre-process binarized monochrome image data
      let tracingSourceUrl = "";
      
      if (state.preset === "silhouette") {
        tracingSourceUrl = generateBinarizedThresholdSourceUrl();
      } else {
        // Direct data url of the original canvas
        tracingSourceUrl = elHiddenCanvas.toDataURL("image/png");
      }

      // 2. Map fine-tuned parameters to ImageTracerJS configurations
      // Precision parameters: lower error threshold values mean closer shape alignment
      const ltres = 5.2 - state.curvePrecision; 
      const qtres = 5.2 - state.curvePrecision;

      const options = {
        numberofcolors: state.colorsCount,
        blurradius: state.blurRadius,
        pathomit: state.noiseFilter,
        ltres: ltres,
        qtres: qtres,
        scale: 1,
        // Quantization options
        colorsampling: 2, // 1: random sampling, 2: deterministic clustering
        mincolorratio: 0.001
      };

      // 3. Fire local ImageTracer execution asynchronously
      ImageTracer.imageToSVG(
        tracingSourceUrl,
        (svgString) => {
          // Adjust width/height attributes in XML so SVG behaves completely responsive in CSS viewports
          let responsiveSvgXml = svgString
            .replace(/width="[0-9]+"/, 'width="100%"')
            .replace(/height="[0-9]+"/, 'height="100%"');

          state.tracedSvgXml = responsiveSvgXml;
          
          // Inject output vector elements live into container DOM
          elVectorOutput.innerHTML = responsiveSvgXml;
          
          // Complete tracing
          state.isTracing = false;
          elProcessingOverlay.style.display = "none";
        },
        options
      );

    } catch (err) {
      console.error("Vector Tracing Failed.", err);
      alert("Error: Client-side tracer error. Please verify file coordinates.");
      state.isTracing = false;
      elProcessingOverlay.style.display = "none";
    }
  }, 80);
}

// Binarize pixels to create flawless, crisp monochrome lines
function generateBinarizedThresholdSourceUrl() {
  const w = state.origWidth;
  const h = state.origHeight;
  
  // Set temporary canvas dimensions
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext("2d");
  
  // Draw original
  tempCtx.drawImage(state.originalImage, 0, 0, w, h);
  
  const imgData = tempCtx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const threshold = state.monoThreshold;

  // Standard luma coefficient ratios for grayscaling
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const a = data[i+3];

    if (a < 10) {
      // Keep completely transparent pixels transparent
      data[i] = 255;
      data[i+1] = 255;
      data[i+2] = 255;
      data[i+3] = 0;
    } else {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const binarized = gray >= threshold ? 255 : 0;
      
      // Silhouettes are black vector lines on white canvas (or vice versa)
      data[i] = binarized;
      data[i+1] = binarized;
      data[i+2] = binarized;
      data[i+3] = 255;
    }
  }

  // Draw binarized data back onto temp canvas and return data url
  tempCtx.putImageData(imgData, 0, 0);
  return tempCanvas.toDataURL("image/png");
}

// --- Action Exporters ---
function copySvgXmlToClipboard() {
  if (!state.tracedSvgXml) return;

  navigator.clipboard.writeText(state.tracedSvgXml)
    .then(() => {
      const originalText = elBtnCopy.innerHTML;
      elBtnCopy.innerHTML = "✓ SVG Copied!";
      elBtnCopy.style.borderColor = "var(--color-green)";
      setTimeout(() => {
        elBtnCopy.innerHTML = originalText;
        elBtnCopy.style.borderColor = "";
      }, 1500);
    })
    .catch(err => {
      console.error("Clipboard copy failed.", err);
      alert("Failed to copy code to clipboard. Please copy manually from code editor.");
    });
}

function triggerDownloadSvgFile() {
  if (!state.tracedSvgXml) return;

  const blob = new Blob([state.tracedSvgXml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // Standard clean naming
  const baseName = state.imageName.substring(0, state.imageName.lastIndexOf(".")) || "vector";
  const downloadName = `${baseName}_vectorized.svg`;

  const link = document.createElement("a");
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
