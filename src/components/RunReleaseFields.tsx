export default function RunReleaseFields({
  releaseVersion,
  environment,
}: {
  releaseVersion?: string | null;
  environment?: string | null;
}) {
  return (
    <>
      <label className="workspace__field">
        Versión del release (opcional)
        <input name="releaseVersion" maxLength={100} defaultValue={releaseVersion ?? ""} />
      </label>
      <label className="workspace__field">
        Entorno de ejecución (opcional)
        <input name="environment" maxLength={100} defaultValue={environment ?? ""} />
      </label>
    </>
  );
}
