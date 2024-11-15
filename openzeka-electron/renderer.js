const ipcRenderer = window.electron.ipcRenderer;

document.getElementById('getCameras').addEventListener('click', async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const cameraList = document.getElementById('cameraList');
    cameraList.innerHTML = '';

    videoDevices.forEach(camera => {
        const listItem = document.createElement('li');

        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.name = 'camera';
        radioInput.value = camera.deviceId;

        const label = document.createElement('label');
        label.textContent = camera.label || `Camera ${camera.deviceId}`;
        label.style.marginLeft = '8px';

        listItem.appendChild(radioInput);
        listItem.appendChild(label);
        cameraList.appendChild(listItem);
    });
});

document.getElementById('startCamera').addEventListener('click', async () => {
    const selectedCamera = document.querySelector('input[name="camera"]:checked');
    if (!selectedCamera) {
        alert('Please select a camera first.');
        return;
    }

    const deviceId = selectedCamera.value;
    document.getElementById('liveFeed').srcObject = await navigator.mediaDevices.getUserMedia({video: {deviceId: {exact: deviceId}}});
});

document.getElementById('stopCamera').addEventListener('click', () => {
    const stream = document.getElementById('liveFeed').srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('liveFeed').srcObject = null;
});

document.getElementById('startScreenShare').addEventListener('click', async () => {
    try {
        // Request screen sources from the main process
        const sources = await ipcRenderer.invoke('get-sources');
        console.log('Screen sources:', sources);

        // Display sources as options
        const sourceList = document.createElement('ul');
        sourceList.id = 'sourceList';
        document.body.appendChild(sourceList);

        sources.forEach((source) => {
            const listItem = document.createElement('li');

            const button = document.createElement('button');
            button.textContent = source.name;
            button.onclick = async () => {
                // Notify main process that screen sharing has started
                ipcRenderer.send('start-screen-share');

                // Capture the selected screen using getUserMedia in the renderer
                document.getElementById('liveFeed').srcObject = await navigator.mediaDevices.getUserMedia({
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: source.id
                        }
                    }
                });

                // Remove the source list after selection
                sourceList.remove();
            };

            listItem.appendChild(button);
            sourceList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Screen sharing failed:', error);
        alert('Screen sharing failed. Please make sure you have permission.');
    }
});

document.getElementById('stopStream').addEventListener('click', () => {
    const stream = document.getElementById('liveFeed').srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('liveFeed').srcObject = null;

    // Notify main process that screen sharing has stopped
    ipcRenderer.send('stop-screen-share');
});

// Event listeners to capture user interactions on the live feed
document.getElementById('liveFeed').addEventListener('mousedown', (event) => {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    ipcRenderer.send('mouse-click', { x, y });
    console.log('Mouse click:', x, y);
});

document.getElementById('liveFeed').addEventListener('mousemove', (event) => {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    ipcRenderer.send('mouse-move', { x, y });
    console.log('Mouse move:', x, y);
});

document.addEventListener('keydown', (event) => {
    ipcRenderer.send('key-press', { key: event.key });
    console.log('Key press:', event.key);
});
