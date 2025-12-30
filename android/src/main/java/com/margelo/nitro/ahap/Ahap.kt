package com.margelo.nitro.ahap
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class Ahap : HybridAhapSpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
