export async function validateStandardGlb(arrayBuffer, { maxIssues = 100 } = {}) {
  const validator = await import('gltf-validator')
  const report = await validator.validateBytes(new Uint8Array(arrayBuffer), {
    uri: 'liberty-cat.glb',
    maxIssues,
    externalResourceFunction: () => Promise.reject(new Error('External resources are not allowed in GLB')),
  })
  return Object.freeze({
    valid: report.issues.numErrors === 0,
    errors: report.issues.numErrors,
    warnings: report.issues.numWarnings,
    infos: report.issues.numInfos,
    hints: report.issues.numHints,
    messages: Object.freeze(report.issues.messages.map(message => Object.freeze({
      code: message.code,
      severity: message.severity,
      message: message.message,
      pointer: message.pointer,
    }))),
  })
}

export async function optimizeStandardGlb(arrayBuffer, { meshopt: useMeshopt = true } = {}) {
  const [{ WebIO }, { ALL_EXTENSIONS, EXTMeshoptCompression }, functions, optimizer] = await Promise.all([
    import('@gltf-transform/core'),
    import('@gltf-transform/extensions'),
    import('@gltf-transform/functions'),
    import('meshoptimizer'),
  ])
  await optimizer.MeshoptEncoder.ready
  const io = new WebIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.decoder': optimizer.MeshoptDecoder,
      'meshopt.encoder': optimizer.MeshoptEncoder,
    })
  const document = await io.readBinary(new Uint8Array(arrayBuffer))
  await document.transform(functions.resample(), functions.dedup(), functions.prune())
  if (useMeshopt) {
    await document.transform(functions.meshopt({ encoder: optimizer.MeshoptEncoder, level: 'medium' }))
    document.createExtension(EXTMeshoptCompression).setRequired(true)
  }
  const bytes = await io.writeBinary(document)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

