# How to use Islet CCA Java API

The Islet CCA Java API provides a way to access Arm Confidential Compute Architecture (CCA) features from within an Android Islet realm. This API allows you to perform remote attestation, measurement extension, secret derivation, and secure provisioning operations.

## API Overview

The main entry point for the Islet CCA functionality is the `com.islet.Cca` class, which provides static methods for all confidential computing operations. The Javadoc documentation for the Islet CCA Java API can be found [here](../implement/libccplugin-islet-realm-api.md).

## Use Case Scenarios

1. **Remote Attestation**: Generate attestation tokens to prove the integrity and configuration of your realm to external parties.

2. **Secure Provisioning**: Download sensitive assets (like machine learning models or cryptographic keys) from a provisioning server after successful attestation verification.

3. **Measurement Extension**: Extend Realm Extensible Measurement (REM) slots with custom measurements to track the integrity of runtime-loaded code or data.

4. **Secret Derivation**: Generate VM instance-bound secrets for encryption or authentication purposes.

## Example use cases

### Attestation

Remote attestation is a fundamental security mechanism that allows the Attester ([RATS](https://datatracker.ietf.org/doc/html/rfc9334)) to prove its trustworthiness to external parties. The Realm Management Monitor provides two cryptographically signed tokens that contain evidence of the state of the CCA platform and a realm. The CCA platform token contains identity information, platform state (e.g. debug mode), and measurements of the platform firmware. The Realm token contains Realm Initial Measurements (RIM), runtime measurements that have been extended into the REM (Realm Extensible Measurement) slots, and freshness information (nonce). The attestation token serves as verifiable proof that the realm is running in a trusted environment with unmodified code and configuration. For more information about the Arm CCA attestation token content and its format, please refer to the [Realm Management Monitor specification](https://developer.arm.com/documentation/den0137/1-0rel0/?lang=en).

In case of Arm CCA, the attestation process is based on hardware-rooted security primitives (Hardware Enforced Security module) provided by the Arm CCA architecture. It uses a challenge-response model where an external verifier provides a unique challenge that is incorporated into the attestation token. This prevents replay attacks and ensures that each attestation operation produces a fresh, unique token.

The example below requests an Arm CCA attestation token. The resulting `attestationToken` can be passed to the caller which usually sends it back to the external Attestation Verification Service/Relying Party for further processing and security decision:

```java
// Create a challenge (0-64 bytes)
byte[] challenge = "my-challenge".getBytes();

// Request attestation
Cca.AttestationResult result = Cca.requestAttestation(challenge);

if (result.isSuccess()) {
    // Use the attestation token
    byte[] attestationToken = result.data;
    // Send to verifier for validation
} else {
    // Handle error based on result.status
    switch (result.status) {
        case ERROR_INVALID_CHALLENGE:
            // Challenge size is invalid
            break;
        case ERROR_ATTESTATION_FAILED:
            // Attestation failed
            break;
        case ERROR_UNSUPPORTED:
            // Not supported in current environment
            break;
    }
}
```

### Secure Provisioning

Secure provisioning is a critical process that ensures sensitive assets such as machine learning models, cryptographic keys, or other confidential data are downloaded and installed in a trusted environment. This mechanism leverages the remote attestation capabilities of the Islet CCA framework to establish trust between the realm and an external provisioning server.

The provisioning workflow begins with the realm generating an attestation token that proves its integrity and configuration to the provisioning server. Only after the server successfully verifies this attestation token, it can establish a secure TLS channel with the realm. This ensures that sensitive assets are only delivered to legitimate, uncompromised realms.

The provisioning mechanism requires access to an external provisioning server. The CC service application package should have incorporated a CA root certificate (`assets/certs/server-ca.pem`) used to verify authenticity of the provisioning server. In this example the provisioning client will establish a secure TLS channel upon remote attestation procedure and then download `model.tflite` file from the provisioning server into the `/mnt/encryptedstore/models/model.tflite` location. Once the provisioning process finishes successfully, the `IProvisioningCallback.onSuccess()` callback is called to inform the service that the `model.tflite` file has been successfully downloaded.

```java
// Define provisioning callback
IProvisioningCallback callback = new IProvisioningCallback.Stub() {
    @Override
    public void onError(byte code) {
        // Handle provisioning error
        Log.e("Provisioning", "Error: " + code);
    }

    @Override
    public void onSuccess(String url, String destination) throws RemoteException {
        // Asset successfully provisioned
        Log.i("Provisioning", "Success: " + destination);
        // Initialize your application with the provisioned asset
    }
};

// Start provisioning
String modelUrl = "https://" + PROVISIONING_SERVER_IP_ADDRESS + "/model.tflite";
String caCertPath = "certs/server-ca.pem";  // Relative to assets folder
String destination = "models/model.tflite";  // Relative to encrypted storage

Cca.StartProvisioningStatus status = Cca.startProvisioning(
    modelUrl,
    caCertPath,
    destination,
    callback
);

if (status != Cca.StartProvisioningStatus.OK) {
    // Handle provisioning start error
}
```

### Measurement Extension

Measurement extension is a crucial security feature that allows realms to track the integrity of runtime-loaded code or data. This mechanism enables the realm to measure dynamically loaded components at runtime, ensuring that the attestation evidence accurately reflects the current state of the realm throughout its execution.

The REM (Realm Extensible Measurement) slots provide a way to cryptographically record changes to the realm's state after initialization. Each extension operation uses a hash-extend mechanism that combines the existing measurement with new data, creating a verifiable chain of measurements that can be validated during attestation.

According to the [Realm Management Monitor Specification](https://developer.arm.com/documentation/den0137/1-0rel0/?lang=en), we have 4 REM (Realm Extensible Measurement) slots available and one RIM (Realm Initial Measurement) slot. The RIM slot is read only during runtime. It reflects the initial state of the realm (the measurement of the memory after loading the Linux kernel, initrd, device tree right before running the kernel). The REM slots can be extended in run-time using a hash-extend operation. This means that you cannot just write a value to these slots, replacing the old content. Instead, the REM content is calculated using a hash function from the old REM content and a value passed to `Cca.measurementExtend()` method. Note that the initial value of REM content before the Realm is launched is zero. In our solution, we utilize:

- REM0 slot to measure the Microdroid system image,
- REM1 slot to measure the CC Service application and its dependencies (mounted APEX files)

Thus for the purpose of the CC Service it is recommended to use slots REM2 and REM3.

The following example shows how to extend REM slots with custom measurements:

```java
// Extend REM2 slot with a custom measurement
byte[] measurement = hashOfTheData.getBytes();
Cca.MeasurementExtendStatus status = Cca.measurementExtend(
    Cca.MeasurementSlotIndex.REM2,
    measurement
);

switch (status) {
    case OK:
        // Measurement extended successfully
        break;
    case ERROR_INVALID_MEASUREMENT:
        // Measurement size is invalid
        break;
    case ERROR_FAILED_TO_EXTEND_ARM_CCA_REM_SLOT:
        // Failed to extend slot
        break;
    case ERROR_UNSUPPORTED:
        // Not supported in current environment
        break;
}
```

### Secret Derivation

Secret derivation is a fundamental cryptographic capability that enables the generation of unique, device-bound secrets within Arm CCA realms. These secrets are cryptographically derived from the hardware-rooted security primitives and are bound to the specific execution environment, making them invaluable for establishing secure communication channels, protecting sensitive data, and implementing device-unique authentication mechanisms.

A key concept in secret derivation is the "Sealing Key," which is a specialized form of derived secret used for the "sealing" process. Sealing refers to the encryption of data in a way that binds it to a particular realm and platform configuration. This ensures that sealed data can only be unsealed (decrypted) by the same realm running on the same platform with the same security configuration. The sealing process provides strong protection against data extraction and tampering, as the sealing key is cryptographically tied to the realm's and the platform's hardware identity.

The secret derivation mechanism leverages the hardware-protected key hierarchy established during the realm initialization process. At the root of this hierarchy is the Hardware Unique Key (HUK) stored in the Hardware Enforced Security (HES) module, which ensures that each derived secret is intrinsically tied to the physical device. This binding provides strong anti-cloning properties, preventing secrets from being replicated or transferred to other devices.

In the Islet implementation, secret derivation serves several critical security functions:
- **Data Protection**: Encrypting sensitive application data that should remain confidential and device-bound
- **Authentication**: Generating device-unique authentication tokens for secure service access
- **Key Wrapping**: Creating wrapping keys for protecting other cryptographic keys in the system
- **Integrity Verification**: Deriving keys for HMAC operations to ensure data integrity

The `Cca.getVmInstanceSecret()` method implements the secret derivation functionality, producing cryptographically strong secrets that are deterministic for a given identifier within the same VM instance. This means that calling the method with the same identifier will always produce the same secret value, enabling consistent key derivation for applications while maintaining uniqueness across different VM instances and devices.

This example shows how a CC Service can retrieve VM instance-bound secrets.

```java
// Derive a secret bound to this VM instance
byte[] identifier = "my-secret-identifier".getBytes();
int secretSize = 32; // Up to 32 bytes

byte[] secret = Cca.getVmInstanceSecret(identifier, secretSize);

if (secret != null) {
    // Use the derived secret for encryption or authentication
    // The same identifier will always produce the same secret
    // for this specific VM instance
}
```

### Encrypted Storage

This example shows how to retrieve the encrypted storage path. The [Encrypted Storage](https://android.googlesource.com/platform/packages/modules/Virtualization/+/refs/tags/android-15.0.0_r8/guest/encryptedstore/) is an AVF's mechanism that provide encrypted persistent storage for services running in VMs. The encrypted partition which uses a key that is bound to a particular VM instance. The disk image backing that encrypted mountpoint is kept on the Android side in the CC Proxy application data folder and its content survives the VM reboot. A service can freely store files in plain text in that location.

The below example shows how to retrieve the mountpoint path of an encrypted storage.

```java
// Get path to encrypted storage
String encryptedStoragePath = Cca.getEncryptedStoragePath();
if (encryptedStoragePath != null) {
    // Use for storing sensitive data
    String modelPath = encryptedStoragePath + "/models/my-model.tflite";
}
```

### Retrieval of the APK contents path

The APK contents path points to the read-only mountpoint of your application's APK. This path is particularly useful for accessing bundled assets, libraries, or other resources that were packaged with your application during build time.

When running within an Islet realm, your application has access to its APK contents through a mounted filesystem. This allows you to read configuration files, assets, or native libraries that were included in your APK without needing to extract them to storage first.

```java
// Get path to APK contents
String apkContentsPath = Cca.getApkContentsPath();
if (apkContentsPath != null) {
    // Access read-only APK contents
    String configPath = apkContentsPath + "/assets/config.json";

    // You can also access other bundled resources
    String libPath = apkContentsPath + "/lib/arm64-v8a/libmylibrary.so";
    String rawResourcePath = apkContentsPath + "/res/raw/datafile.txt";
}
```

**Important considerations:**
- The whole APK content is not encrypted, thus it is not intended for storing confidential data in plain text. However, some files can be kept in the APK in encrypted form. Consider scenarios where data is stored in the APK's assets folder in encrypted form, with the decryption key provisioned from an external server.
- The APK contents are mounted as read-only filesystem
- Any attempt to write to this location will fail
- The path is only valid within the Islet realm context
- Files accessed through this path maintain their original packaging structure

This mechanism is especially useful for accessing large assets or native libraries without consuming additional storage space in the encrypted storage area.

## Complete Example: Secure Model Provisioning

Here's a complete example showing how to provision a machine learning model securely:

```java
public class SecureModelService extends Service {
    private static final String MODEL_URL = "https://172.33.21.22/model.tflite";
    private static final String CA_CERT = "certs/server-ca.pem";
    private static final String MODEL_DEST = "models/model.tflite";

    private String mModelPath;

    @Override
    public void onCreate() {
        super.onCreate();
        // Get encrypted storage path
        String encryptedStorePath = Cca.getEncryptedStoragePath();
        if (encryptedStorePath != null) {
            mModelPath = encryptedStorePath + "/" + MODEL_DEST;
        }
    }

    // Define provisioning callback
    IProvisioningCallback callback = new IProvisioningCallback.Stub() {
        @Override
        public void onError(byte code) {
            // Handle provisioning error
            Log.e("Provisioning", "Error: " + code);
        }

        @Override
        public void onSuccess(String url, String destination) throws RemoteException {
            // Asset successfully provisioned
            Log.i("Provisioning", "Success: " + destination);
            // Initialize the Tensorflow Lite engine with the provisioned model ...
        }
    };

    private void provisionModel(IProvisioningCallback callback) {
        // Check if model already exists
        File modelFile = new File(mModelPath);
        if (!modelFile.exists()) {
            // Start provisioning process
            Cca.StartProvisioningStatus status = Cca.startProvisioning(
                MODEL_URL,
                CA_CERT,
                MODEL_DEST,
                callback
            );

            if (status != Cca.StartProvisioningStatus.OK) {
                // Handle provisioning start error
                Log.e("Provisioning", "Failed to start provisioning");
            }
        } else {
            // Model already provisioned
            try {
                callback.onSuccess(MODEL_URL, MODEL_DEST);
            } catch (RemoteException e) {
                Log.e("Provisioning", "Callback error", e);
            }
        }
    }

    // ... rest of service implementation
}
```

## Error Handling

All API methods return status enums that should be checked:

- `AttestationStatus` for attestation operations
- `MeasurementExtendStatus` for measurement extension operations
- `StartProvisioningStatus` for provisioning operations

Always check the status before using the results of any operation.

## Security Considerations

1. **Attestation Challenges**: Use fresh, unpredictable challenges for each attestation request to prevent replay attacks. Generate cryptographically secure random challenges of sufficient length for each attestation operation. The challenge value should be unique for every request and never reused to ensure the freshness of the attestation evidence. Store challenges securely in memory during the attestation process and clear them immediately after use to prevent unauthorized access. Consider implementing challenge expiration mechanisms to limit the validity window of attestation tokens, adding an additional layer of protection against potential delayed replay attempts.

2. **Provisioning Security**: Always verify the server's identity using CA certificates during provisioning to establish a trusted communication channel. Ensure that the provisioning server's certificate is signed by a trusted Certificate Authority and that the certificate chain is properly validated. Note that CA certificates can be securely stored within the CC Service application's assets folder as the application content is reflected in the Realm attestation token. Thus, any tampering with the application can be detected during the remote attestation process.

3. **Secret Management**: Derived secrets are bound to the VM instance and persist across reboots but not VM recreation. These secrets provide strong device-binding properties but require careful handling to maintain their security benefits. Never log or store derived secrets in plain text in memory or persistent storage. Clear secret values from memory as soon as they are no longer needed using secure erase functions that prevent compiler optimizations from removing the clearing code. Use secrets only for their intended cryptographic purposes and avoid exposing them through debugging interfaces or crash dumps. Implement proper key derivation practices when using the derived secrets as keying material, including the use of appropriate key derivation functions (KDFs) when deriving multiple keys from a single secret.

4. **Measurement Integrity**: REM slots can only be extended, not modified or cleared, so plan your measurement strategy carefully. Each extension operation uses a cryptographically secure hash function to combine the existing measurement with new data, creating an immutable record of the realm's runtime state. Design your measurement strategy to capture critical security-relevant events such as loading of application code, configuration changes, or access to sensitive resources. Understand that measurements are one-way operations and cannot be undone, so avoid measuring non-deterministic data or data that may change frequently. Implement proper error handling for measurement extension operations and verify the success of each extension before proceeding with dependent operations. Consider the ordering of measurements as it affects the final measurement value, and document your measurement strategy to ensure consistency across different components and versions of your application.

5. **Interface Sanitization**: CC Services running in a realm must implement sanitized interfaces that are exposed to Android applications. These interfaces must not expose any confidential data outside the realm boundary, including secret keys and other sensitive information retrieved using the Islet CCA Java API. All data exchanged through these interfaces should be carefully validated and filtered to prevent information leakage. Implement strict input validation on all interface parameters to prevent injection attacks and buffer overflows. Sanitize any output data to remove sensitive information that could inadvertently reveal internal state or implementation details.

6. **Secure Coding Practices**: Follow secure coding practices specific to the isolated realm environment, including rigorous input validation, proper error handling, and avoiding unsafe operations that could compromise the realm's integrity. Implement defense-in-depth strategies and regularly review code for potential vulnerabilities. Use memory-safe programming techniques and avoid unsafe operations that could lead to buffer overflows or memory corruption. Implement proper exception handling to prevent information leakage through error messages. Follow the principle of least privilege when accessing system resources and APIs. Regularly update dependencies and libraries to address known security vulnerabilities. Conduct security-focused code reviews and consider using static analysis tools to identify potential security issues.

7. **Resource Management**: Be mindful of the realm's limited resources compared to the host system. Carefully manage memory usage, CPU consumption, and storage limitations to prevent denial-of-service scenarios within the realm. Implement proper resource cleanup and monitoring to ensure the CC service operates efficiently within the constrained environment. Monitor memory allocation patterns and implement proper garbage collection strategies to prevent memory exhaustion. Use efficient algorithms and data structures to minimize CPU and memory usage. Implement resource quotas and limits to prevent any single operation from consuming excessive resources. Handle resource exhaustion conditions gracefully and implement retry mechanisms with exponential backoff for transient resource issues. Regularly monitor resource usage patterns to identify potential performance bottlenecks or resource leaks.

## Supported Environments

The Islet CCA Java API is only available within Islet realms running on Arm CCA-enabled hardware. When running in environments without CCA support, API methods will return appropriate `ERROR_UNSUPPORTED` status values.