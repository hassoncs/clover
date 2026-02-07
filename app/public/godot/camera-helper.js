(function() {
    let video = null;
    let canvas = null;
    let ctx = null;
    let stream = null;
    let animationFrameId = null;
    let targetEntityId = null;
    let frameRate = 20;
    let lastFrameTime = 0;

    window._cameraFrameData = null;
    window._cameraFrameWidth = 0;
    window._cameraFrameHeight = 0;

    async function startCamera(entityId, width = 640, height = 480) {
        if (stream) {
            stopCamera();
        }

        targetEntityId = entityId;
        window._cameraFrameWidth = width;
        window._cameraFrameHeight = height;

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: width,
                    height: height,
                    facingMode: 'user'
                }
            });

            if (!video) {
                video = document.createElement('video');
                video.autoplay = true;
                video.playsInline = true;
            }
            video.srcObject = stream;

            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                ctx = canvas.getContext('2d', { willReadFrequently: true });
            }

            video.onloadedmetadata = () => {
                video.play();
                lastFrameTime = performance.now();
                captureLoop();
            };

            console.log(`[CameraHelper] Camera started for entity: ${entityId}`);
        } catch (err) {
            console.error('[CameraHelper] Failed to start camera:', err);
        }
    }

    function stopCamera() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            stream = null;
        }

        if (video) {
            video.srcObject = null;
        }

        targetEntityId = null;
        window._cameraFrameData = null;
    }

    function captureLoop() {
        if (!stream) return;

        const now = performance.now();
        const elapsed = now - lastFrameTime;

        if (elapsed >= (1000 / frameRate)) {
            lastFrameTime = now;

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                window._cameraFrameData = new Uint8Array(imageData.data.buffer);
            }
        }

        animationFrameId = requestAnimationFrame(captureLoop);
    }

    window.startCamera = startCamera;
    window.stopCamera = stopCamera;
})();
