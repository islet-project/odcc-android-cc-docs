# App Package Structure

Confidential computing splits logic across the Normal World and the Realm, but from a host packaging perspective the integrator ships one Android application package (APK)** for the application that integrates CCPlugIn. That package is installed and launched like any other host app; it carries the host-side entry points (including CC Proxy) together with the Realm-side service implementation and glue. Client applications are external: any third-party or first-party app that already uses `bindService` against the published component name continues to do so without being part of this APK.

Inside the Realm, Microdroid runs a confidential workload made up of the same APK (mounted on the guest as the application image) plus APEX modules that the guest is configured to activate. That workload is what Microdroid Manager attaches and starts so the CC Service and CC Stub can execute in isolation.

## Contents of the CC-enabled application APK

At a high level, that APK contains:

- CCProxyService and matching AndroidManifest entries so the host exposes the AIDL surface while the implementation executes in the Realm.
- Realm-side support (CC Stub and related bootstrap) and metadata (for example a generated asset with the FQCN of the Java CC Service class) so the guest can launch the correct implementation.

How CCPlugIn wires `aidl`, Soong, and generated sources is out of scope for this overview; see [How to Integrate Confidential Computing into Android](https://pages.github.sec.samsung.net/SYSSEC/odcc-android-cc-docs/usage/odcc-ccplugin.html) and [AIDL-generated components](./aidl-generated-components.md).

## Confidential workload (inside the Realm)

The confidential workload is the combination of that APK (CC Service and related code) and the APEX set supplied for the guest. The APEX layer is dominated by the ART modular runtime (typically the `com.android.art` APEX in AOSP builds) so Java/DEX-based CC Services can run inside Microdroid; additional APEX modules may be included when the build or guest configuration requires extra modular platform pieces (for example further libraries or services exposed as APEX on the host). Those modules are activated on the guest alongside the APK according to the Android Virtualization Framework / Microdroid guest model.

## Summary

| Deliverable | Runs where | Role |
|-------------|------------|------|
| External client apps | Normal World | Unchanged `bindService` to the exported AIDL service; not part of the CC-enabled application’s package |
| CC-enabled application APK | Normal World + guest image source | Host: CC Proxy / VM control; Realm: CC Service + Stub |
| APEX modules with the confidential workload | Realm (Microdroid guest) | ART (Java/DEX runtime) and any other declared modular dependencies the guest needs beyond the APK |
