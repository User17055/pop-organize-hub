import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  CircleAlert,
  ListTodo,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loginWithGoogle } from "@/lib/api/pop-organize.functions";
import { workspaceQueryKey } from "@/lib/api/use-workspace";

type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: Record<string, string | number | boolean>,
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

function GoogleLoginButton({
  onCredential,
  disabled,
}: {
  onCredential: (credential: string) => void;
  disabled: boolean;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) return;

    function renderButton() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => callbackRef.current(credential),
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        locale: "pt-BR",
        width: Math.min(buttonRef.current.clientWidth || 370, 370),
      });
    }

    if (window.google) {
      renderButton();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", renderButton, { once: true });
      return () => existing.removeEventListener("load", renderButton);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.googleIdentity = "true";
    script.addEventListener("load", renderButton, { once: true });
    document.head.appendChild(script);
    return () => script.removeEventListener("load", renderButton);
  }, [clientId]);

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className="flex h-14 w-full items-center justify-center gap-3 rounded-[18px] bg-white text-sm font-bold text-[#202124] opacity-70"
      >
        <span
          className="bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_0_40%,#fbbc05_0_65%,#ea4335_0_82%,#4285f4_0)] bg-clip-text font-sans text-xl font-black text-transparent"
          aria-hidden="true"
        >
          G
        </span>
        Continuar com Google
      </button>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <div ref={buttonRef} className="flex min-h-12 w-full justify-center overflow-hidden" />
    </div>
  );
}

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar - Pop Organize" }] }),
  component: LoginPage,
});

const ONBOARDING_STORAGE_KEY = "pop-organize:onboarding-completed";

const onboardingSlides: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  detailIcon: LucideIcon;
}> = [
  {
    title: "Organize tudo em um só lugar",
    description: "Crie tarefas, defina prazos e acompanhe suas atividades com facilidade.",
    icon: ListTodo,
    detailIcon: CalendarDays,
  },
  {
    title: "Trabalhe junto com sua equipe",
    description: "Distribua tarefas entre empresas, setores, grupos e colaboradores.",
    icon: Users,
    detailIcon: Building2,
  },
  {
    title: "Acompanhe cada etapa",
    description: "Receba notificações, revise atividades e nunca perca um prazo.",
    icon: BellRing,
    detailIcon: Check,
  },
];

function OnboardingFlow({ onFinish }: { onFinish: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselRef, carouselApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    duration: 24,
    loop: false,
  });
  const isLastSlide = currentIndex === onboardingSlides.length - 1;

  const goToSlide = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= onboardingSlides.length || nextIndex === currentIndex) return;
    carouselApi?.scrollTo(nextIndex);
  };

  useEffect(() => {
    if (!carouselApi) return;
    const updateSelectedSlide = () => setCurrentIndex(carouselApi.selectedScrollSnap());
    updateSelectedSlide();
    carouselApi.on("select", updateSelectedSlide);
    carouselApi.on("reInit", updateSelectedSlide);
    return () => {
      carouselApi.off("select", updateSelectedSlide);
      carouselApi.off("reInit", updateSelectedSlide);
    };
  }, [carouselApi]);

  return (
    <main className="flex min-h-screen justify-center bg-[#2c2c2c]">
      <section className="flex min-h-screen w-full max-w-[460px] flex-col overflow-hidden bg-[#2c2c2c] px-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white sm:min-h-[820px] sm:px-8">
        <div className="flex items-center justify-center font-display text-[28px] font-bold tracking-[-0.05em]">
          P<span className="mx-[2px] h-[18px] w-[18px] rounded-full bg-[#1687f8]" />
          pOrganize
        </div>

        <div ref={carouselRef} className="-mx-7 flex-1 overflow-hidden sm:-mx-8">
          <div className="flex h-full cursor-grab touch-pan-y active:cursor-grabbing">
            {onboardingSlides.map((item, index) => {
              const Icon = item.icon;
              const DetailIcon = item.detailIcon;
              return (
                <article
                  key={item.title}
                  className="flex min-w-0 flex-[0_0_100%] select-none flex-col items-center justify-center px-7 text-center sm:px-8"
                >
                  <OnboardingArtwork index={index} Icon={Icon} DetailIcon={DetailIcon} />

                  <h1 className="mt-10 max-w-[320px] font-display text-[29px] font-bold leading-[1.16] tracking-[-0.035em]">
                    {index === 0 && (
                      <>
                        Organize <span className="text-[#1687f8]">tudo</span> em um só lugar
                      </>
                    )}
                    {index === 1 && (
                      <>
                        Trabalhe junto com sua <span className="text-[#1687f8]">equipe</span>
                      </>
                    )}
                    {index === 2 && (
                      <>
                        Acompanhe <span className="text-[#1687f8]">cada</span> etapa
                      </>
                    )}
                  </h1>
                  <p className="mt-4 max-w-[310px] text-[15px] leading-6 text-white/58">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-9 flex items-center justify-center gap-2.5">
            {onboardingSlides.map((item, index) => (
              <span
                key={item.title}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "w-8 bg-[#1687f8]" : "w-2.5 bg-white"
                }`}
              />
            ))}
          </div>

          {isLastSlide ? (
            <div className="grid grid-cols-[auto_1fr] items-center gap-5">
              <button
                type="button"
                onClick={() => goToSlide(currentIndex - 1)}
                className="flex h-14 items-center justify-center rounded-[18px] bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/15 active:scale-[0.98]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={onFinish}
                className="flex h-14 items-center justify-center gap-2 rounded-[18px] bg-white text-sm font-bold text-[#1687f8] shadow-[0_14px_30px_-18px_rgba(255,255,255,0.65)] transition active:scale-[0.98]"
              >
                Começar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={currentIndex === 0 ? onFinish : () => goToSlide(currentIndex - 1)}
                className="flex h-14 items-center justify-center rounded-[18px] bg-white/10 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/15 active:scale-[0.98]"
              >
                {currentIndex === 0 ? "Pular" : "Voltar"}
              </button>
              <button
                type="button"
                onClick={() => goToSlide(currentIndex + 1)}
                className="flex h-14 items-center justify-center gap-2 rounded-[18px] bg-[#378edc] text-sm font-bold text-white shadow-[0_10px_22px_-16px_rgba(55,142,220,0.42)] transition hover:bg-[#4195df] active:scale-[0.98]"
              >
                Próximo <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function OnboardingArtwork({
  index,
  Icon,
  DetailIcon,
}: {
  index: number;
  Icon: LucideIcon;
  DetailIcon: LucideIcon;
}) {
  if (index === 1) {
    return (
      <div className="relative h-[300px] w-[300px] shrink-0" aria-hidden="true">
        <img
          src="/onboarding-team.png"
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#2c2c2c] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#2c2c2c] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#2c2c2c] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#2c2c2c] to-transparent" />
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="relative h-[300px] w-[300px] shrink-0" aria-hidden="true">
        <img
          src="/onboarding-track.png"
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#2c2c2c] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#2c2c2c] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#2c2c2c] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#2c2c2c] to-transparent" />
      </div>
    );
  }

  const isTeamSlide = index === 1;

  return (
    <div className="relative h-[220px] w-[238px] shrink-0" aria-hidden="true">
      <div
        className={`absolute inset-0 bg-[#f7f7f7] shadow-[0_24px_55px_-32px_rgba(0,0,0,0.9)] ${
          isTeamSlide
            ? "rounded-[110px_110px_42px_42px]"
            : "rotate-[-3deg] rounded-[48px_82px_54px_74px]"
        }`}
      />
      <div
        className={`absolute bg-[#1687f8]/12 ${
          isTeamSlide
            ? "right-5 top-5 h-24 w-16 rounded-[999px_999px_24px_24px]"
            : "left-5 top-7 h-20 w-20 rounded-[24px_42px_28px_44px]"
        }`}
      />
      <div
        className={`absolute bg-[#d9dde3] ${
          isTeamSlide
            ? "bottom-5 left-5 h-14 w-24 rounded-[22px_48px_26px_36px]"
            : "bottom-5 right-5 h-14 w-14 rotate-12 rounded-[18px]"
        }`}
      />
      <div
        className={`absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-[#2c2c2c] shadow-[0_22px_34px_-18px_rgba(0,0,0,0.65)] ${
          isTeamSlide ? "rounded-[56px_56px_24px_24px]" : "rotate-3 rounded-[34px_22px_38px_26px]"
        }`}
      >
        <Icon
          className={`h-14 w-14 text-[#1687f8] ${isTeamSlide ? "" : "-rotate-3"}`}
          strokeWidth={1.8}
        />
      </div>
      <div
        className={`absolute flex h-12 w-12 items-center justify-center bg-[#1687f8] text-white shadow-lg ${
          isTeamSlide
            ? "-right-1 bottom-8 rounded-[16px_24px_18px_22px] rotate-6"
            : "-right-1 top-8 rounded-[22px_16px_24px_18px] -rotate-6"
        }`}
      >
        <DetailIcon className="h-5 w-5" strokeWidth={2.4} />
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const googleMutation = useMutation({
    mutationFn: (credential: string) => loginWithGoogle({ data: { credential } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      navigate({ to: "/" });
    },
  });

  const errorMessage = googleMutation.error instanceof Error ? googleMutation.error.message : null;
  const isPending = googleMutation.isPending;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowOnboarding(
      params.get("onboarding") === "1" || localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "true",
    );
  }, []);

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setShowOnboarding(false);
  };

  if (showOnboarding === null) {
    return <main className="min-h-screen bg-[#2c2c2c]" />;
  }

  if (showOnboarding) {
    return <OnboardingFlow onFinish={finishOnboarding} />;
  }

  return (
    <main className="login-screen flex min-h-screen justify-center bg-[#2c2c2c] p-0">
      <section className="login-card-enter flex min-h-screen w-full max-w-[460px] flex-col overflow-hidden bg-[#2c2c2c] px-7 pb-7 pt-[max(2rem,env(safe-area-inset-top))] text-white sm:min-h-[820px] sm:px-8">
        <div className="flex items-center justify-center font-display text-xl font-bold tracking-[-0.04em]">
          P
          <span className="mx-px h-3.5 w-3.5 rounded-full bg-[#1687f8]" aria-label="o" />
          pOrganize
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-[#f7f7f7] shadow-[0_24px_55px_-30px_rgba(0,0,0,0.8)]">
            <div className="absolute left-5 top-10 h-20 w-20 rounded-full bg-[#1687f8]/12" />
            <div className="absolute bottom-7 right-5 h-16 w-16 rounded-full bg-[#d9dde3]" />
            <div className="relative w-28 rounded-[20px] bg-[#2c2c2c] p-4 text-left shadow-xl">
              <div className="mb-3 flex items-center gap-2 text-white">
                <ListTodo className="h-5 w-5 text-[#1687f8]" />
                <span className="text-xs font-bold">Minhas tarefas</span>
              </div>
              {["Planejar", "Organizar", "Concluir"].map((item, index) => (
                <div key={item} className="mt-2 flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full ${
                      index < 2 ? "bg-[#1687f8]" : "bg-white/18"
                    }`}
                  >
                    {index < 2 && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-[9px] font-semibold text-white/80">{item}</span>
                </div>
              ))}
            </div>
            <div className="absolute -right-1 bottom-8 flex h-10 w-10 items-center justify-center rounded-full bg-[#1687f8] text-white shadow-lg">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <h1 className="mt-10 font-display text-[36px] font-bold leading-tight tracking-[-0.04em]">
            Organize tudo.
          </h1>
          <p className="mt-3 max-w-[320px] text-sm leading-6 text-white/58">
            Pessoas, tarefas e equipes em um só lugar, de um jeito simples.
          </p>
        </div>

        <div className="mx-auto w-full max-w-[380px]">
          <GoogleLoginButton
            onCredential={(credential) => googleMutation.mutate(credential)}
            disabled={isPending}
          />

          <Link
            to="/"
            className="mt-4 flex h-14 w-full items-center justify-center rounded-[18px] bg-white text-sm font-bold text-[#191919] transition hover:bg-white/92 active:scale-[0.99]"
          >
            Continuar sem login
          </Link>

          {errorMessage && (
            <div className="mt-4 flex items-start justify-center gap-2 text-xs text-destructive">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="mt-6 text-center text-[11px] leading-5 text-white/42">
            Ao continuar, você aceita nossos Termos de Uso e Política de Privacidade.
          </p>
        </div>
      </section>
    </main>
  );
}
