# Try the Demo Apps

Below are demo apps that showcase confidential computing on Android end-to-end. Each demo has its own setup and run instructions—please follow the corresponding guide to build, run, and try it.

- [Simple Example](./odcc-example-aosp.md) — The simplest demo: a Random Number Generator service running inside the Realm to validate the basic integration flow for confidential computing on Android.
- [TensorFlow Lite BERT QA](./odcc-tf-lite-bert-qa.md) — BERT-based question answering on TensorFlow Lite, wired to run inside the Realm and return answers to the client.
- [AI Model Provisioning](./odcc-tf-lite-bert-qa-provisioning.md) — It is the odcc-tf-lite-bert-qa application adjusted to use the [Remote Provisioning](../design/provisioning.md) mechanism. The TensorFlow Lite model is not put inside the assets folder, instead it is provisioned from an external provisioning server using RA-TLS (Remote Attestation combined with TLS) secure channel.