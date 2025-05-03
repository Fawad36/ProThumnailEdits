const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');
const previewContainer = document.getElementById('previewContainer');
let img = new Image();
let uploadedImg = new Image();
let texts = [{ position: { x: 50, y: 300 }, text: '', color: '#ffffff', bgColor: '#000000', useGradient: false, fontFamily: 'Inter', fontStyle: 'normal', fontSize: 40, shadowSize: 0, strokeSize: 0, glowSize: 0, visible: true }];
let emojis = [];
let imgPosition = { x: 100, y: 100, width: 200, height: 150, rotation: 0, visible: true };
let dragging = false;
let draggingImg = false;
let draggingEmoji = false;
let draggingPreview = false;
let activeTextIndex = -1;
let activeEmojiIndex = -1;
let history = [];
let redoStack = [];
let currentState = {};
let customFonts = [];

const emojiList = ['😀', '😂', '😍', '🔥', '⭐', '🚀', '🎉', '💡', '👀', '👍', '❤️', '🎥', '⚡', '🌟', '💥', '🦁', '🎨', '🌈', '🍎', '🏆', '🎸', '🍕', '⚽', '📸', '🎄'];

// Prevent Zoom and Default Behaviors
function preventZoom(e) {
  e.preventDefault();
}

// Bind Action Button Events
function bindButtonEvents() {
  document.querySelectorAll('.action-button').forEach(button => {
    // Remove existing listeners to prevent duplicates
    button.removeEventListener('click', handleButtonAction);
    button.removeEventListener('touchstart', handleButtonTouch);

    // Add click event for desktop
    button.addEventListener('click', handleButtonAction);

    // Add touch event for mobile
    button.addEventListener('touchstart', handleButtonTouch, { passive: false });
  });
}

// Handle Button Click
function handleButtonAction(e) {
  const button = e.currentTarget;
  const onclick = button.getAttribute('onclick');
  if (onclick) {
    eval(onclick); // Execute the onclick function
  }
}

// Handle Button Touch
function handleButtonTouch(e) {
  e.preventDefault();
  const button = e.currentTarget;
  const onclick = button.getAttribute('onclick');
  if (onclick) {
    // Add a slight delay to improve touch responsiveness
    setTimeout(() => {
      eval(onclick);
    }, 100);
  }
}

// Toggle Control Group Collapse
function toggleControlGroup(e) {
  const controlGroup = e.currentTarget.closest('.control-group');
  if (controlGroup) {
    controlGroup.classList.toggle('collapsed');
  }
}

// Bind Collapse Events to Control Group Headers
function bindCollapseEvents() {
  document.querySelectorAll('.control-group h3').forEach(header => {
    header.removeEventListener('click', toggleControlGroup);
    header.removeEventListener('touchstart', preventZoom);
    header.addEventListener('click', toggleControlGroup);
    header.addEventListener('touchstart', preventZoom, { passive: false });
  });
}

// Preview Dragging and Resizing
let previewDragOffset = { x: 0, y: 0 };

// Mouse Events for Desktop
previewContainer.addEventListener('mousedown', (e) => {
  if (e.target.classList.contains('resize-handle')) return;
  draggingPreview = true;
  const rect = previewContainer.getBoundingClientRect();
  previewDragOffset.x = e.clientX - rect.left;
  previewDragOffset.y = e.clientY - rect.top;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (draggingPreview) {
    let newX = e.clientX - previewDragOffset.x;
    let newY = e.clientY - previewDragOffset.y;
    const rect = previewContainer.getBoundingClientRect();
    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
    previewContainer.style.left = `${newX}px`;
    previewContainer.style.top = `${newY}px`;
  }
});

document.addEventListener('mouseup', () => {
  draggingPreview = false;
});

// Touch Events for Mobile
previewContainer.addEventListener('touchstart', (e) => {
  if (e.target.classList.contains('resize-handle')) return;
  draggingPreview = true;
  const touch = e.touches[0];
  const rect = previewContainer.getBoundingClientRect();
  previewDragOffset.x = touch.clientX - rect.left;
  previewDragOffset.y = touch.clientY - rect.top;
  e.preventDefault();
});

document.addEventListener('touchmove', (e) => {
  if (draggingPreview) {
    const touch = e.touches[0];
    let newX = touch.clientX - previewDragOffset.x;
    let newY = touch.clientY - previewDragOffset.y;
    const rect = previewContainer.getBoundingClientRect();
    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
    previewContainer.style.left = `${newX}px`;
    previewContainer.style.top = `${newY}px`;
    e.preventDefault();
  }
});

document.addEventListener('touchend', () => {
  draggingPreview = false;
});

// Snap to Top-Right on Mobile
function snapToTopRight() {
  if (window.innerWidth <= 768) {
    previewContainer.style.left = `${window.innerWidth - 160 - 8}px`;
    previewContainer.style.top = '0.5rem';
    previewContainer.style.width = '160px';
    previewContainer.style.height = '90px';
    previewCanvas.width = 160;
    previewCanvas.height = 90;
  }
}

// Resize Preview Dynamically
function resizePreview() {
  if (window.innerWidth <= 768) {
    const maxWidth = Math.min(160, window.innerWidth * 0.4);
    previewContainer.style.width = `${maxWidth}px`;
    previewContainer.style.height = `${maxWidth / (16/9)}px`;
    previewCanvas.width = maxWidth;
    previewCanvas.height = maxWidth / (16/9);
    snapToTopRight();
  } else if (window.innerWidth <= 1024) {
    previewContainer.style.width = '200px';
    previewContainer.style.height = '112.5px';
    previewCanvas.width = 200;
    previewCanvas.height = 112.5;
  } else {
    previewContainer.style.width = '320px';
    previewContainer.style.height = '180px';
    previewCanvas.width = 320;
    previewCanvas.height = 180;
  }
  drawImage();
}

// Toggle Preview
function togglePreview() {
  previewContainer.classList.toggle('hidden');
  if (!previewContainer.classList.contains('hidden')) {
    snapToTopRight();
  }
}

// Reset Preview
function resetPreview() {
  resizePreview();
  previewContainer.classList.remove('hidden');
  previewContainer.style.left = '';
  previewContainer.style.top = '';
  drawImage();
}

// Populate Emoji Picker
function populateEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  picker.innerHTML = '';
  emojiList.forEach(emoji => {
    const button = document.createElement('button');
    button.textContent = emoji;
    button.classList.add('action-button');
    button.onclick = () => {
      const size = parseInt(document.getElementById('emojiSize').value);
      const opacity = parseFloat(document.getElementById('emojiOpacity').value);
      emojis.push({ emoji, position: { x: 150, y: 150 }, size, opacity, visible: true });
      activeEmojiIndex = emojis.length - 1;
      updateLayers();
      drawImage();
      saveState();
    };
    picker.appendChild(button);
  });
  bindButtonEvents();
}

// Add Text Input
function addTextInput() {
  const textInputs = document.getElementById('textInputs');
  const newTextGroup = document.createElement('div');
  newTextGroup.className = 'text-input-group mb-4';
  newTextGroup.innerHTML = `
    <input type="text" class="overlayText w-full" placeholder="Enter Text">
    <div class="flex gap-3 mt-3">
      <input type="color" class="textColor w-1/2" value="#ffffff">
      <input type="color" class="textBgColor w-1/2" value="#000000">
    </div>
    <label class="text-sm text-gray-600 mt-3 block">Use Gradient Background</label>
    <input type="checkbox" class="useGradient mt-1">
    <label class="text-sm text-gray-600 mt-3 block">Glow Effect</label>
    <input type="range" class="glowSize w-full mt-1" min="0" max="20" value="0">
    <select class="fontFamily w-full mt-3">
      <option value="Inter">Inter</option>
      <option value="Arial">Arial</option>
      <option value="Roboto">Roboto</option>
      <option value="Georgia">Georgia</option>
      ${customFonts.map(font => `<option value="${font}">${font}</option>`).join('')}
    </select>
    <select class="fontStyle w-full mt-3">
      <option value="normal">Normal</option>
      <option value="bold">Bold</option>
      <option value="italic">Italic</option>
    </select>
    <input type="number" class="fontSize w-full mt-3" value="40" min="10" max="100">
    <input type="range" class="shadowSize w-full mt-3" min="0" max="20" value="0">
    <label class="text-sm text-gray-600">Text Shadow</label>
    <input type="range" class="strokeSize w-full mt-3" min="0" max="5" step="0.1" value="0">
    <label class="text-sm text-gray-600">Text Stroke</label>
    <div class="mt-3">
      <h4 class="text-sm font-semibold text-gray-600">Move Text</h4>
      <div class="grid grid-cols-3 gap-2 mt-2">
        <button onclick="moveText(${texts.length}, 'up')" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 action-button">↑</button>
        <button onclick="moveText(${texts.length}, 'left')" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 action-button">←</button>
        <button onclick="moveText(${texts.length}, 'right')" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 action-button">→</button>
        <div></div>
        <button onclick="moveText(${texts.length}, 'down')" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 action-button">↓</button>
        <div></div>
      </div>
    </div>
  `;
  textInputs.appendChild(newTextGroup);
  texts.push({ position: { x: 50, y: 300 + texts.length * 50 }, text: '', color: '#ffffff', bgColor: '#000000', useGradient: false, fontFamily: 'Inter', fontStyle: 'normal', fontSize: 40, shadowSize: 0, strokeSize: 0, glowSize: 0, visible: true });
  bindTextInputs();
  updateLayers();
  bindButtonEvents();
  bindCollapseEvents();
  saveState();
}

// Bind Text Inputs
function bindTextInputs() {
  document.querySelectorAll('.text-input-group').forEach((group, index) => {
    const overlayText = group.querySelector('.overlayText');
    const textColor = group.querySelector('.textColor');
    const textBgColor = group.querySelector('.textBgColor');
    const useGradient = group.querySelector('.useGradient');
    const fontFamily = group.querySelector('.fontFamily');
    const fontStyle = group.querySelector('.fontStyle');
    const fontSize = group.querySelector('.fontSize');
    const shadowSize = group.querySelector('.shadowSize');
    const strokeSize = group.querySelector('.strokeSize');
    const glowSize = group.querySelector('.glowSize');

    overlayText.value = texts[index].text;
    textColor.value = texts[index].color;
    textBgColor.value = texts[index].bgColor;
    useGradient.checked = texts[index].useGradient;
    fontFamily.value = texts[index].fontFamily;
    fontStyle.value = texts[index].fontStyle;
    fontSize.value = texts[index].fontSize;
    shadowSize.value = texts[index].shadowSize;
    strokeSize.value = texts[index].strokeSize;
    glowSize.value = texts[index].glowSize;

    overlayText.oninput = () => {
      texts[index].text = overlayText.value;
      updateLayers();
      drawImage();
      saveState();
    };
    textColor.oninput = () => {
      texts[index].color = textColor.value;
      drawImage();
      saveState();
    };
    textBgColor.oninput = () => {
      texts[index].bgColor = textBgColor.value;
      drawImage();
      saveState();
    };
    useGradient.onchange = () => {
      texts[index].useGradient = useGradient.checked;
      drawImage();
      saveState();
    };
    fontFamily.oninput = () => {
      texts[index].fontFamily = fontFamily.value;
      drawImage();
      saveState();
    };
    fontStyle.oninput = () => {
      texts[index].fontStyle = fontStyle.value;
      drawImage();
      saveState();
    };
    fontSize.oninput = () => {
      texts[index].fontSize = parseInt(fontSize.value);
      drawImage();
      saveState();
    };
    shadowSize.oninput = () => {
      texts[index].shadowSize = parseInt(shadowSize.value);
      drawImage();
      saveState();
    };
    strokeSize.oninput = () => {
      texts[index].strokeSize = parseFloat(strokeSize.value);
      drawImage();
      saveState();
    };
    glowSize.oninput = () => {
      texts[index].glowSize = parseInt(glowSize.value);
      drawImage();
      saveState();
    };
  });
}

// Move Text
function moveText(index, direction) {
  const step = 10;
  switch (direction) {
    case 'up': texts[index].position.y -= step; break;
    case 'down': texts[index].position.y += step; break;
    case 'left': texts[index].position.x -= step; break;
    case 'right': texts[index].position.x += step; break;
  }
  drawImage();
  saveState();
}

// Move Image
function moveImage(direction) {
  const step = 10;
  switch (direction) {
    case 'up': imgPosition.y -= step; break;
    case 'down': imgPosition.y += step; break;
    case 'left': imgPosition.x -= step; break;
    case 'right': imgPosition.x += step; break;
  }
  drawImage();
  saveState();
}

// Move Emoji
function moveEmoji(direction) {
  if (activeEmojiIndex < 0 || !emojis[activeEmojiIndex]) return;
  const step = 10;
  switch (direction) {
    case 'up': emojis[activeEmojiIndex].position.y -= step; break;
    case 'down': emojis[activeEmojiIndex].position.y += step; break;
    case 'left': emojis[activeEmojiIndex].position.x -= step; break;
    case 'right': emojis[activeEmojiIndex].position.x += step; break;
  }
  drawImage();
  saveState();
}

// Update Layers
function updateLayers() {
  const layerList = document.getElementById('layerList');
  layerList.innerHTML = '';
  
  if (uploadedImg.src) {
    const imgLayer = document.createElement('div');
    imgLayer.className = 'layer-item';
    imgLayer.innerHTML = `
      Image
      <div>
        <button onclick="toggleLayer('image', true)">↑</button>
        <button onclick="toggleLayer('image', false)">↓</button>
        <button onclick="toggleVisibility('image')">${imgPosition.visible ? 'Hide' : 'Show'}</button>
        <button onclick="deleteLayer('image')">Delete</button>
      </div>
    `;
    layerList.appendChild(imgLayer);
  }

  texts.forEach((text, index) => {
    if (!text.text) return;
    const textLayer = document.createElement('div');
    textLayer.className = 'layer-item';
    textLayer.innerHTML = `
      Text: ${text.text.substring(0, 10)}${text.text.length > 10 ? '...' : ''}
      <div>
        <button onclick="moveLayer('text', ${index}, true)">↑</button>
        <button onclick="moveLayer('text', ${index}, false)">↓</button>
        <button onclick="toggleVisibility('text', ${index})">${text.visible ? 'Hide' : 'Show'}</button>
        <button onclick="deleteLayer('text', ${index})">Delete</button>
      </div>
    `;
    textLayer.onclick = () => { activeTextIndex = index; drawImage(); };
    layerList.appendChild(textLayer);
  });

  emojis.forEach((emoji, index) => {
    const emojiLayer = document.createElement('div');
    emojiLayer.className = 'layer-item';
    emojiLayer.innerHTML = `
      Emoji: ${emoji.emoji}
      <div>
        <button onclick="moveLayer('emoji', ${index}, true)">↑</button>
        <button onclick="moveLayer('emoji', ${index}, false)">↓</button>
        <button onclick="toggleVisibility('emoji', ${index})">${emoji.visible ? 'Hide' : 'Show'}</button>
        <button onclick="deleteLayer('emoji', ${index})">Delete</button>
      </div>
    `;
    emojiLayer.onclick = () => { activeEmojiIndex = index; drawImage(); };
    layerList.appendChild(emojiLayer);
  });
}

// Move Layer
function moveLayer(type, index, up) {
  if (type === 'text' && texts[index]) {
    if (up && index > 0) {
      [texts[index], texts[index - 1]] = [texts[index - 1], texts[index]];
    } else if (!up && index < texts.length - 1) {
      [texts[index], texts[index + 1]] = [texts[index + 1], texts[index]];
    }
  } else if (type === 'emoji' && emojis[index]) {
    if (up && index > 0) {
      [emojis[index], emojis[index - 1]] = [emojis[index - 1], emojis[index]];
    } else if (!up && index < emojis.length - 1) {
      [emojis[index], emojis[index + 1]] = [emojis[index + 1], emojis[index]];
    }
  }
  updateLayers();
  drawImage();
  saveState();
}

// Toggle Layer
function toggleLayer(type, up) {
  drawImage();
  saveState();
}

// Toggle Visibility
function toggleVisibility(type, index) {
  if (type === 'image') {
    imgPosition.visible = !imgPosition.visible;
  } else if (type === 'text' && texts[index]) {
    texts[index].visible = !texts[index].visible;
  } else if (type === 'emoji' && emojis[index]) {
    emojis[index].visible = !emojis[index].visible;
  }
  updateLayers();
  drawImage();
  saveState();
}

// Delete Layer
function deleteLayer(type, index) {
  if (type === 'image') {
    uploadedImg = new Image();
    imgPosition = { x: 100, y: 100, width: 200, height: 150, rotation: 0, visible: true };
  } else if (type === 'text' && texts[index]) {
    texts.splice(index, 1);
    updateTextInputs();
  } else if (type === 'emoji' && emojis[index]) {
    emojis.splice(index, 1);
    activeEmojiIndex = emojis.length - 1;
  }
  updateLayers();
  drawImage();
  saveState();
}

// Apply Template
function applyTemplate(template) {
  if (template === 'bold') {
    texts = [{ position: { x: 50, y: 300 }, text: 'Bold Title', color: '#ff0000', bgColor: '#000000', useGradient: false, fontFamily: 'Inter', fontStyle: 'bold', fontSize: 60, shadowSize: 5, strokeSize: 1, glowSize: 5, visible: true }];
  } else if (template === 'minimal') {
    texts = [{ position: { x: 50, y: 300 }, text: 'Clean Text', color: '#ffffff', bgColor: '#000000', useGradient: false, fontFamily: 'Arial', fontStyle: 'normal', fontSize: 40, shadowSize: 0, strokeSize: 0, glowSize: 0, visible: true }];
  } else if (template === 'vibrant') {
    texts = [{ position: { x: 50, y: 300 }, text: 'Vibrant Pop', color: '#ffff00', bgColor: '#ff00ff', useGradient: true, fontFamily: 'Roboto', fontStyle: 'italic', fontSize: 50, shadowSize: 3, strokeSize: 0.5, glowSize: 3, visible: true }];
  }
  updateTextInputs();
  drawImage();
  saveState();
}

// Save State
function saveState() {
  redoStack = [];
  history.push(JSON.stringify(currentState));
  if (history.length > 50) history.shift();
  currentState = {
    texts: texts.map(t => ({ ...t, position: { ...t.position } })),
    emojis: emojis.map(e => ({ ...e, position: { ...e.position } })),
    imgPosition: { ...imgPosition },
    brightness: document.getElementById('brightness').value,
    contrast: document.getElementById('contrast').value,
    saturation: document.getElementById('saturation').value,
    grayscale: document.getElementById('grayscale').value,
    sepia: document.getElementById('sepia').value,
    blur: document.getElementById('blur').value,
    imgSize: document.getElementById('imgSize').value,
    imgOpacity: document.getElementById('imgOpacity').value,
    imgRotation: document.getElementById('imgRotation').value,
    emojiSize: document.getElementById('emojiSize').value,
    emojiOpacity: document.getElementById('emojiOpacity').value,
    backgroundColor: document.getElementById('backgroundColor').value
  };
}

// Undo
function undo() {
  if (history.length > 0) {
    redoStack.push(JSON.stringify(currentState));
    const lastState = JSON.parse(history.pop());
    texts = lastState.texts.map(t => ({ ...t, position: { ...t.position } }));
    emojis = lastState.emojis.map(e => ({ ...e, position: { ...e.position } }));
    imgPosition = { ...lastState.imgPosition };
    ['brightness', 'contrast', 'saturation', 'grayscale', 'sepia', 'blur', 'imgSize', 'imgOpacity', 'imgRotation', 'emojiSize', 'emojiOpacity', 'backgroundColor'].forEach(id => {
      document.getElementById(id).value = lastState[id];
    });
    document.documentElement.style.setProperty('--bg-color', lastState.backgroundColor);
    updateTextInputs();
    updateLayers();
    drawImage();
  }
}

// Redo
function redo() {
  if (redoStack.length > 0) {
    history.push(JSON.stringify(currentState));
    const nextState = JSON.parse(redoStack.pop());
    texts = nextState.texts.map(t => ({ ...t, position: { ...t.position } }));
    emojis = nextState.emojis.map(e => ({ ...e, position: { ...e.position } }));
    imgPosition = { ...nextState.imgPosition };
    ['brightness', 'contrast', 'saturation', 'grayscale', 'sepia', 'blur', 'imgSize', 'imgOpacity', 'imgRotation', 'emojiSize', 'emojiOpacity', 'backgroundColor'].forEach(id => {
      document.getElementById(id).value = nextState[id];
    });
    document.documentElement.style.setProperty('--bg-color', nextState.backgroundColor);
    updateTextInputs();
    updateLayers();
    drawImage();
  }
}

// Update Text Inputs
function updateTextInputs() {
  const textInputs = document.getElementById('textInputs');
  textInputs.innerHTML = '';
  texts.forEach((text, index) => {
    const newTextGroup = document.createElement('div');
    newTextGroup.className = 'text-input-group mb-4';
    newTextGroup.innerHTML = `
      <input type="text" class="overlayText w-full" placeholder="Enter Text" value="${text.text}">
      <div class="flex gap-3 mt-3">
        <input type="color" class="textColor w-1/2" value="${text.color}">
        <input type="color" class="textBgColor w-1/2" value="${text.bgColor}">
      </div>
      <label class="text-sm text-gray-600 mt-3 block">Use Gradient Background</label>
      <input type="checkbox" class="useGradient mt-1" ${text.useGradient ? 'checked' : ''}>
      <label class="text-sm text-gray-600 mt-3 block">Glow Effect</label>
      <input type="range" class="glowSize w-full mt-1" min="0" max="20" value="${text.glowSize}">
      <select class="fontFamily w-full mt-3">
        <option value="Inter" ${text.fontFamily === 'Inter' ? 'selected' : ''}>Inter</option>
        <option value="Arial" ${text.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
        <option value="Roboto" ${text.fontFamily === 'Roboto' ? 'selected' : ''}>Roboto</option>
        <option value="Georgia" ${text.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
        ${customFonts.map(font => `<option value="${font}" ${text.fontFamily === font ? 'selected' : ''}>${font}</option>`).join('')}
      </select>
      <select class="fontStyle w-full mt-3">
        <option value="normal" ${text.fontStyle === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="bold" ${text.fontStyle === 'bold' ? 'selected' : ''}>Bold</option>
        <option value="italic" ${text.fontStyle === 'italic' ? 'selected' : ''}>Italic</option>
      </select>
      <input type="number" class="fontSize w-full mt-3" value="${text.fontSize}" min="10" max="100">
      <input type="range" class="shadowSize w-full mt-3" min="0" max="20" value="${text.shadowSize}">
      <label class="text-sm text-gray-600">Text Shadow</label>
      <input type="range" class="strokeSize w-full mt-3" min="0" max="5" step="0.1" value="${text.strokeSize}">
      <label class="text-sm text-gray-600">Text Stroke</label>
      <div class="mt-3">
        <h4 class="text-sm font-semibold text-gray-600">Move Text</h4>
        <div class="grid grid-cols-3 gap-2 mt-2">
          <button onclick="moveText(${index}, 'up')" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 action-button">↑</button>
          <button onclick="moveText(${index}, 'left')" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 action-button">←</button>
          <button onclick="moveText(${index}, 'right')" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 action-button">→</button>
          <div></div>
          <button onclick="moveText(${index}, 'down')" class="bg-gray-200 p-2 rounded-lg hover:bg-gray-300 action-button">↓</button>
          <div></div>
        </div>
      </div>
    `;
    textInputs.appendChild(newTextGroup);
  });
  bindTextInputs();
  bindButtonEvents();
  bindCollapseEvents();
}

// Get Video ID
function getVideoID(url) {
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^\s&]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// Load Thumbnail
function loadThumbnail() {
  const videoId = getVideoID(document.getElementById('url').value);
  if (!videoId) return alert("Invalid YouTube URL");
  img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = () => {
    drawImage();
    saveState();
  };
  img.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// File Upload Handlers
document.getElementById('uploadImg').addEventListener('change', function (e) {
  const reader = new FileReader();
  reader.onload = function (event) {
    img = new Image();
    img.onload = () => {
      drawImage();
      saveState();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
});

document.getElementById('internalImg').addEventListener('change', function (e) {
  const reader = new FileReader();
  reader.onload = function (event) {
    uploadedImg = new Image();
    uploadedImg.onload = () => {
      updateLayers();
      drawImage();
      saveState();
    };
    uploadedImg.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
});

document.getElementById('customFont').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const font = new FontFace(file.name.split('.')[0], `url(${event.target.result})`);
      font.load().then(() => {
        document.fonts.add(font);
        customFonts.push(file.name.split('.')[0]);
        updateTextInputs();
      });
    };
    reader.readAsDataURL(file);
  }
});

// Template Change
document.getElementById('template').addEventListener('change', function () {
  applyTemplate(this.value);
});

// Background Color Change
document.getElementById('backgroundColor').addEventListener('change', function () {
  document.documentElement.style.setProperty('--bg-color', this.value);
  saveState();
});

// Draw Image
function drawImage() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  const filters = `
    brightness(${document.getElementById('brightness').value}%)
    contrast(${document.getElementById('contrast').value}%)
    saturate(${document.getElementById('saturation').value}%)
    grayscale(${document.getElementById('grayscale').value}%)
    sepia(${document.getElementById('sepia').value}%)
    blur(${document.getElementById('blur').value}px)
  `;
  ctx.filter = filters;
  previewCtx.filter = filters;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  previewCtx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);

  if (uploadedImg.src && imgPosition.visible) {
    const imgSize = parseInt(document.getElementById('imgSize').value);
    const opacity = parseFloat(document.getElementById('imgOpacity').value);
    const rotation = parseFloat(document.getElementById('imgRotation').value) * Math.PI / 180;
    imgPosition.width = imgSize;
    imgPosition.height = imgSize * (uploadedImg.height / uploadedImg.width);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(imgPosition.x + imgPosition.width / 2, imgPosition.y + imgPosition.height / 2);
    ctx.rotate(rotation);
    ctx.drawImage(uploadedImg, -imgPosition.width / 2, -imgPosition.height / 2, imgPosition.width, imgPosition.height);
    ctx.restore();

    previewCtx.save();
    previewCtx.globalAlpha = opacity;
    const scale = previewCanvas.width / canvas.width;
    previewCtx.translate((imgPosition.x * scale) + (imgPosition.width * scale / 2), (imgPosition.y * scale) + (imgPosition.height * scale / 2));
    previewCtx.rotate(rotation);
    previewCtx.drawImage(uploadedImg, -imgPosition.width * scale / 2, -imgPosition.height * scale / 2, imgPosition.width * scale, imgPosition.height * scale);
    previewCtx.restore();
  }

  texts.forEach((text, index) => {
    if (!text.text || !text.visible) return;
    ctx.font = `${text.fontStyle} ${text.fontSize}px ${text.fontFamily}`;
    previewCtx.font = `${text.fontStyle} ${text.fontSize * (previewCanvas.width / canvas.width)}px ${text.fontFamily}`;
    const textMetrics = ctx.measureText(text.text);
    const textWidth = textMetrics.width;
    const textHeight = text.fontSize * 1.2;
    const padding = 8;

    if (text.bgColor && text.bgColor !== '#000000') {
      if (text.useGradient) {
        const gradient = ctx.createLinearGradient(text.position.x, text.position.y - textHeight, text.position.x + textWidth, text.position.y);
        gradient.addColorStop(0, text.bgColor);
        gradient.addColorStop(1, '#ffffff');
        ctx.fillStyle = gradient;
        const pGradient = previewCtx.createLinearGradient(
          text.position.x * (previewCanvas.width / canvas.width),
          (text.position.y - textHeight) * (previewCanvas.width / canvas.width),
          (text.position.x + textWidth) * (previewCanvas.width / canvas.width),
          text.position.y * (previewCanvas.width / canvas.width)
        );
        pGradient.addColorStop(0, text.bgColor);
        pGradient.addColorStop(1, '#ffffff');
        previewCtx.fillStyle = pGradient;
      } else {
        ctx.fillStyle = text.bgColor;
        previewCtx.fillStyle = text.bgColor;
      }
      ctx.fillRect(
        text.position.x - padding,
        text.position.y - text.fontSize - padding / 2,
        textWidth + padding * 2,
        textHeight + padding
      );
      previewCtx.fillRect(
        text.position.x * (previewCanvas.width / canvas.width) - padding * (previewCanvas.width / canvas.width),
        (text.position.y - text.fontSize) * (previewCanvas.width / canvas.width) - (padding / 2) * (previewCanvas.width / canvas.width),
        textWidth * (previewCanvas.width / canvas.width) + padding * 2 * (previewCanvas.width / canvas.width),
        textHeight * (previewCanvas.width / canvas.width) + padding * (previewCanvas.width / canvas.width)
      );
    }

    if (text.glowSize > 0) {
      ctx.shadowColor = text.color;
      ctx.shadowBlur = text.glowSize;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      previewCtx.shadowColor = text.color;
      previewCtx.shadowBlur = text.glowSize * (previewCanvas.width / canvas.width);
      previewCtx.shadowOffsetX = 0;
      previewCtx.shadowOffsetY = 0;
    }

    if (text.shadowSize > 0) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = text.shadowSize;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      previewCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      previewCtx.shadowBlur = text.shadowSize * (previewCanvas.width / canvas.width);
      previewCtx.shadowOffsetX = 0.5 * (previewCanvas.width / canvas.width);
      previewCtx.shadowOffsetY = 0.5 * (previewCanvas.width / canvas.width);
    }

    if (text.strokeSize > 0) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = text.strokeSize;
      ctx.strokeText(text.text, text.position.x, text.position.y);
      previewCtx.strokeStyle = '#000000';
      previewCtx.lineWidth = text.strokeSize * (previewCanvas.width / canvas.width);
      previewCtx.strokeText(text.text, text.position.x * (previewCanvas.width / canvas.width), text.position.y * (previewCanvas.width / canvas.width));
    }

    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.position.x, text.position.y);
    previewCtx.fillStyle = text.color;
    previewCtx.fillText(text.text, text.position.x * (previewCanvas.width / canvas.width), text.position.y * (previewCanvas.width / canvas.width));

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    previewCtx.shadowColor = 'transparent';
    previewCtx.shadowBlur = 0;
    previewCtx.shadowOffsetX = 0;
    previewCtx.shadowOffsetY = 0;
  });

  const emojiSize = parseInt(document.getElementById('emojiSize').value);
  emojis.forEach(emoji => {
    if (!emoji.visible) return;
    ctx.save();
    ctx.globalAlpha = emoji.opacity;
    ctx.font = `${emojiSize}px sans-serif`;
    ctx.fillText(emoji.emoji, emoji.position.x, emoji.position.y);
    previewCtx.save();
    previewCtx.globalAlpha = emoji.opacity;
    previewCtx.font = `${emojiSize * (previewCanvas.width / canvas.width)}px sans-serif`;
    previewCtx.fillText(emoji.emoji, emoji.position.x * (previewCanvas.width / canvas.width), emoji.position.y * (previewCanvas.width / canvas.width));
    ctx.restore();
    previewCtx.restore();
  });
}

// Reset Canvas
function resetCanvas() {
  ['brightness', 'contrast', 'saturation', 'grayscale', 'sepia', 'blur', 'imgSize', 'emojiSize', 'imgOpacity', 'imgRotation', 'emojiOpacity'].forEach(id => {
    document.getElementById(id).value = id === 'blur' || id === 'grayscale' || id === 'sepia' ? 0 : id === 'imgSize' ? 200 : id === 'emojiSize' ? 40 : id === 'imgOpacity' || id === 'emojiOpacity' ? 1 : id === 'imgRotation' ? 0 : 100;
  });
  document.getElementById('template').value = '';
  document.getElementById('backgroundColor').value = '#1e40af';
  document.documentElement.style.setProperty('--bg-color', '#1e40af');
  texts = [{ position: { x: 50, y: 300 }, text: '', color: '#ffffff', bgColor: '#000000', useGradient: false, fontFamily: 'Inter', fontStyle: 'normal', fontSize: 40, shadowSize: 0, strokeSize: 0, glowSize: 0, visible: true }];
  emojis = [];
  imgPosition = { x: 100, y: 100, width: 200, height: 150, rotation: 0, visible: true };
  img = new Image();
  uploadedImg = new Image();
  history = [];
  redoStack = [];
  activeEmojiIndex = -1;
  updateTextInputs();
  updateLayers();
  resetPreview();
  drawImage();
  saveState();
  // Reset control groups to collapsed, except Adjustments
  document.querySelectorAll('.control-group').forEach(group => {
    if (!group.classList.contains('adjustments')) {
      group.classList.add('collapsed');
    } else {
      group.classList.remove('collapsed');
    }
  });
}

// Download Image
function downloadImage() {
  const link = document.createElement('a');
  link.download = 'thumbnail.png';
  link.href = canvas.toDataURL();
  link.click();
}

// Canvas Interactions
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  activeTextIndex = -1;
  texts.forEach((text, index) => {
    if (!text.text || !text.visible) return;
    ctx.font = `${text.fontStyle} ${text.fontSize}px ${text.fontFamily}`;
    const textMetrics = ctx.measureText(text.text);
    const textWidth = textMetrics.width;
    const textHeight = text.fontSize * 1.2;
    if (
      x >= text.position.x - 10 &&
      x <= text.position.x + textWidth + 10 &&
      y >= text.position.y - textHeight - 10 &&
      y <= text.position.y + 10
    ) {
      activeTextIndex = index;
      dragging = true;
    }
  });

  const emojiSize = parseInt(document.getElementById('emojiSize').value);
  activeEmojiIndex = -1;
  emojis.forEach((emoji, index) => {
    if (!emoji.visible) return;
    ctx.font = `${emojiSize}px sans-serif`;
    const emojiMetrics = ctx.measureText(emoji.emoji);
    const emojiWidth = emojiMetrics.width;
    const emojiHeight = emojiSize;
    if (
      x >= emoji.position.x &&
      x <= emoji.position.x + emojiWidth &&
      y >= emoji.position.y - emojiHeight &&
      y <= emoji.position.y
    ) {
      activeEmojiIndex = index;
      draggingEmoji = true;
    }
  });

  if (
    uploadedImg.src && imgPosition.visible &&
    x >= imgPosition.x &&
    x <= imgPosition.x + imgPosition.width &&
    y >= imgPosition.y &&
    y <= imgPosition.y + imgPosition.height
  ) {
    draggingImg = true;
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (dragging && activeTextIndex >= 0) {
    texts[activeTextIndex].position.x = x;
    texts[activeTextIndex].position.y = y;
    drawImage();
  } else if (draggingImg) {
    imgPosition.x = x - imgPosition.width / 2;
    imgPosition.y = y - imgPosition.height / 2;
    drawImage();
  } else if (draggingEmoji && activeEmojiIndex >= 0) {
    emojis[activeEmojiIndex].position.x = x;
    emojis[activeEmojiIndex].position.y = y;
    drawImage();
  }
});

canvas.addEventListener('mouseup', () => {
  if (dragging || draggingImg || draggingEmoji) saveState();
  dragging = false;
  draggingImg = false;
  draggingEmoji = false;
  activeTextIndex = -1;
});

// Input Listeners
['brightness', 'contrast', 'saturation', 'grayscale', 'sepia', 'blur', 'imgSize', 'imgOpacity', 'imgRotation', 'emojiSize', 'emojiOpacity'].forEach(id =>
  document.getElementById(id).addEventListener('input', () => {
    if (id === 'emojiSize' && activeEmojiIndex >= 0) {
      emojis[activeEmojiIndex].size = parseInt(document.getElementById('emojiSize').value);
    }
    drawImage();
    saveState();
  })
);

// Window Resize Handler
window.addEventListener('resize', resizePreview);

// Initialize
resetCanvas();
populateEmojiPicker();
bindButtonEvents();
bindCollapseEvents();
resizePreview();