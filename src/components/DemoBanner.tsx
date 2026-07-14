import { useIsDemo } from "@/hooks/useIsDemo";

export const DemoBanner = () => {
  const isDemo = useIsDemo();
  if (!isDemo) return null;
  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[100] pointer-events-none flex justify-center"
    >
      <div className="mt-2 pointer-events-auto rounded-full border border-gold/50 bg-[#02070d]/90 backdrop-blur px-3 py-1 text-[10px] font-montserrat font-bold uppercase tracking-wider text-gold-light shadow-lg">
        Ambiente de demonstração — dados fictícios
      </div>
    </div>
  );
};
