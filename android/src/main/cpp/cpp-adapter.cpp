#include <jni.h>
#include "ahapOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::ahap::initialize(vm);
}
