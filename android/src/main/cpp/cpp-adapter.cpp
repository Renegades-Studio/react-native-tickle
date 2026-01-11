#include <jni.h>
#include "tickleOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::tickle::initialize(vm);
}
