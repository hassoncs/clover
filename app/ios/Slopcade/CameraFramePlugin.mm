#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <CoreMedia/CMSampleBuffer.h>
#import <CoreVideo/CVPixelBuffer.h>

#include <dlfcn.h>
#include <vector>
// When built in-tree the header is one level up; the Expo config plugin
// copies both files into the same Xcode group so "SharedFrameBuffer.h" works
// in both cases thanks to the include search path.
#if __has_include("SharedFrameBuffer.h")
#include "SharedFrameBuffer.h"
#else
#include "../shared/SharedFrameBuffer.h"
#endif

using GetSharedFrameBufferFn = slopcade::SharedFrameBuffer* (*)();

static slopcade::SharedFrameBuffer* resolveSharedBuffer() {
  static slopcade::SharedFrameBuffer* cached = nullptr;
  if (cached) {
    return cached;
  }

  // Use dlsym to find the canonical instance shared with the GDExtension.
  // Both this plugin (in the app binary) and the GDExtension dylib include
  // SharedFrameBuffer.h, but the inline static local creates separate instances
  // per shared library. dlsym(RTLD_DEFAULT, ...) resolves to the first exported
  // symbol, ensuring both sides share the same buffer.
  void* sym = dlsym(RTLD_DEFAULT, "get_shared_frame_buffer");
  if (sym) {
    auto fn = reinterpret_cast<GetSharedFrameBufferFn>(sym);
    cached = fn();
  } else {
    // Fallback: call the inline function directly. This works if both the FPP
    // and GDExtension are linked into the same binary (e.g., static linking).
    cached = get_shared_frame_buffer();
  }
  return cached;
}

@interface CameraFramePlugin : FrameProcessorPlugin
@end

@implementation CameraFramePlugin

- (instancetype _Nonnull)initWithProxy:(VisionCameraProxyHolder*)proxy
                           withOptions:(NSDictionary* _Nullable)options {
  self = [super initWithProxy:proxy withOptions:options];
  return self;
}

- (id _Nullable)callback:(Frame* _Nonnull)frame
           withArguments:(NSDictionary* _Nullable)arguments {
  CMSampleBufferRef sampleBuffer = frame.buffer;
  CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  if (!pixelBuffer) {
    return nil;
  }

  slopcade::SharedFrameBuffer* sharedBuffer = resolveSharedBuffer();
  if (!sharedBuffer) {
    return nil;
  }

  CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);

  uint8_t* baseAddress = (uint8_t*)CVPixelBufferGetBaseAddress(pixelBuffer);
  size_t width = CVPixelBufferGetWidth(pixelBuffer);
  size_t height = CVPixelBufferGetHeight(pixelBuffer);
  size_t bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer);

  if (!baseAddress || width == 0 || height == 0) {
    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    return nil;
  }

  if (width > slopcade::MAX_FRAME_WIDTH || height > slopcade::MAX_FRAME_HEIGHT) {
    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    return nil;
  }

  OSType pixelFormat = CVPixelBufferGetPixelFormatType(pixelBuffer);

  if (pixelFormat == kCVPixelFormatType_32BGRA) {
    size_t totalBytes = height * bytesPerRow;
    if (totalBytes > slopcade::MAX_FRAME_BYTES) {
      CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
      return nil;
    }

    // Thread-local scratch buffer for BGRA→RGBA conversion (camera thread only)
    static thread_local std::vector<uint8_t> rgbaBuffer;
    if (rgbaBuffer.size() < totalBytes) {
      rgbaBuffer.resize(totalBytes);
    }

    for (size_t row = 0; row < height; row++) {
      uint8_t* srcRow = baseAddress + row * bytesPerRow;
      uint8_t* dstRow = rgbaBuffer.data() + row * bytesPerRow;
      for (size_t col = 0; col < width; col++) {
        size_t offset = col * 4;
        dstRow[offset + 0] = srcRow[offset + 2]; // R ← B
        dstRow[offset + 1] = srcRow[offset + 1]; // G ← G
        dstRow[offset + 2] = srcRow[offset + 0]; // B ← R
        dstRow[offset + 3] = srcRow[offset + 3]; // A ← A
      }
    }

    sharedBuffer->write_frame(rgbaBuffer.data(),
                              (uint32_t)width,
                              (uint32_t)height,
                              (uint32_t)bytesPerRow,
                              slopcade::FrameFormat::RGBA8);
  } else {
    // Non-BGRA format: pass through directly
    sharedBuffer->write_frame(baseAddress,
                              (uint32_t)width,
                              (uint32_t)height,
                              (uint32_t)bytesPerRow,
                              slopcade::FrameFormat::RGBA8);
  }

  CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
  return nil;
}

VISION_EXPORT_FRAME_PROCESSOR(CameraFramePlugin, writeCameraFrame)

@end
