# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Preserve line numbers so crashes from optimized Play builds can be symbolicated with the
# mapping.txt generated alongside the bundle. Replace source names to avoid leaking local paths.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# These metadata attributes are small and are used by Kotlin/Java libraries that inspect generic
# signatures, nested classes or annotations at runtime. Keeping the metadata does not keep the
# classes themselves, so R8 can still shrink and optimize the application.
-keepattributes Signature,InnerClasses,EnclosingMethod
-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,AnnotationDefault
