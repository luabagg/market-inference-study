"use client";

/**
 * Shown when the statistics engine throws. With NEXT_PUBLIC_MOTOR=aluno, each
 * unimplemented stub names the apostila section to write next.
 */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[560px] rounded-xl border border-line bg-white p-8">
      <p className="text-[13px] font-medium text-sample">O motor estatístico parou aqui</p>
      <h1 className="mt-2 text-[22px] font-medium tracking-[-0.02em]">{error.message}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-slate">
        Implemente essa função em <code className="font-mono text-[13px]">src/estatistica/aluno.ts</code> e confira com{" "}
        <code className="font-mono text-[13px]">MOTOR=aluno pnpm test</code>. Para voltar ao motor de referência, rode o app
        sem <code className="font-mono text-[13px]">NEXT_PUBLIC_MOTOR</code>.
      </p>
      <button onClick={reset} className="mt-6 h-9 rounded-md bg-ink px-4 text-[13px] font-medium text-white hover:bg-ink/85">
        Tentar de novo
      </button>
    </div>
  );
}
