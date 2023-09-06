import {FunctionComponent, PropsWithChildren, ReactNode} from 'react';
import React from 'react';

import {usePrevious} from '../utils/usePrevious';
import {UnknownOptions} from '../utils/extractAllowedOptionsUpdates';
import {parseStripeProp} from '../utils/parseStripeProp';
import {registerWithStripeJs} from '../utils/registerWithStripeJs';
import * as stripeJs from '@stripe/stripe-js';

type EmbeddedCheckoutPublicInterface = {
  mount(location: string | HTMLElement): void;
  unmount(): void;
  destroy(): void;
};

export type EmbeddedCheckoutContextValue = {
  embeddedCheckout: EmbeddedCheckoutPublicInterface | null;
};

const EmbeddedCheckoutContext = React.createContext<EmbeddedCheckoutContextValue | null>(
  null
);
EmbeddedCheckoutContext.displayName = 'EmbeddedCheckoutSessionProviderContext';

export const useEmbeddedCheckoutContext = (): EmbeddedCheckoutContextValue => {
  const ctx = React.useContext(EmbeddedCheckoutContext);
  if (!ctx) {
    throw new Error(
      '<EmbeddedCheckout> must be used within <EmbeddedCheckoutSessionProvider>'
    );
  }
  return ctx;
};

interface EmbeddedCheckoutSessionProviderProps {
  /**
   * A [Stripe object](https://stripe.com/docs/js/initializing) or a `Promise`
   * resolving to a `Stripe` object.
   * The easiest way to initialize a `Stripe` object is with the the
   * [Stripe.js wrapper module](https://github.com/stripe/stripe-js/blob/master/README.md#readme).
   * Once this prop has been set, it can not be changed.
   *
   * You can also pass in `null` or a `Promise` resolving to `null` if you are
   * performing an initial server-side render or when generating a static site.
   */
  stripe: PromiseLike<stripeJs.Stripe | null> | stripeJs.Stripe | null;
  /**
   * Embedded Checkout configuration options.
   * You can initially pass in `null` as `options.clientSecret` if you are
   * performing an initial server-side render or when generating a static site.
   */
  options: {
    clientSecret: string | null;
    onComplete?: () => void;
  };
}

interface PrivateEmbeddedCheckoutSessionProviderProps {
  stripe: unknown;
  options: UnknownOptions;
  children?: ReactNode;
}

export const EmbeddedCheckoutSessionProvider: FunctionComponent<PropsWithChildren<
  EmbeddedCheckoutSessionProviderProps
>> = ({
  stripe: rawStripeProp,
  options,
  children,
}: PrivateEmbeddedCheckoutSessionProviderProps) => {
  const parsed = React.useMemo(() => {
    return parseStripeProp(rawStripeProp);
  }, [rawStripeProp]);

  const embeddedCheckoutPromise = React.useRef<Promise<void> | null>(null);
  const loadedStripe = React.useRef<stripeJs.Stripe | null>(null);

  const [ctx, setContext] = React.useState<EmbeddedCheckoutContextValue>({
    embeddedCheckout: null,
  });

  React.useEffect(() => {
    // Don't support any ctx updates once embeddedCheckout or stripe is set.
    if (loadedStripe.current || embeddedCheckoutPromise.current) {
      return;
    }

    const setStripeAndInitEmbeddedCheckout = (stripe: stripeJs.Stripe) => {
      if (loadedStripe.current || embeddedCheckoutPromise.current) return;

      loadedStripe.current = stripe;
      embeddedCheckoutPromise.current = loadedStripe.current
        .initEmbeddedCheckout(options as any)
        .then((embeddedCheckout) => {
          setContext({embeddedCheckout});
        });
    };

    // For an async stripePromise, store it once resolved
    if (
      parsed.tag === 'async' &&
      !loadedStripe.current &&
      options.clientSecret
    ) {
      parsed.stripePromise.then((stripe) => {
        if (stripe) {
          setStripeAndInitEmbeddedCheckout(stripe);
        }
      });
    } else if (
      parsed.tag === 'sync' &&
      !loadedStripe.current &&
      options.clientSecret
    ) {
      // Or, handle a sync stripe instance going from null -> populated
      setStripeAndInitEmbeddedCheckout(parsed.stripe);
    }
  }, [parsed, options, ctx, loadedStripe]);

  React.useEffect(() => {
    // cleanup on unmount
    return () => {
      // If embedded checkout is fully initialized, destroy it.
      if (ctx.embeddedCheckout) {
        embeddedCheckoutPromise.current = null;
        ctx.embeddedCheckout.destroy();
      } else if (embeddedCheckoutPromise.current) {
        // If embedded checkout is still initializing, destroy it once
        // it's done. This could be caused by unmounting very quickly
        // after mounting.
        embeddedCheckoutPromise.current.then(() => {
          embeddedCheckoutPromise.current = null;
          if (ctx.embeddedCheckout) {
            ctx.embeddedCheckout.destroy();
          }
        });
      }
    };
  }, [ctx.embeddedCheckout]);

  // Attach react-stripe-js version to stripe.js instance
  React.useEffect(() => {
    registerWithStripeJs(loadedStripe);
  }, [loadedStripe]);

  // Warn on changes to stripe prop.
  // The stripe prop value can only go from null to non-null once and
  // can't be changed after that.
  const prevStripe = usePrevious(rawStripeProp);
  React.useEffect(() => {
    if (prevStripe !== null && prevStripe !== rawStripeProp) {
      console.warn(
        'Unsupported prop change on EmbeddedCheckoutSessionProvider: You cannot change the `stripe` prop after setting it.'
      );
    }
  }, [prevStripe, rawStripeProp]);

  // Warn on changes to options.
  const prevOptions = usePrevious(options);
  React.useEffect(() => {
    if (prevOptions == null) {
      return;
    }

    if (options == null) {
      console.warn(
        'Unsupported prop change on EmbeddedCheckoutSessionProvider: You cannot unset options after setting them.'
      );
      return;
    }

    if (
      prevOptions.clientSecret != null &&
      options.clientSecret !== prevOptions.clientSecret
    ) {
      console.warn(
        'Unsupported prop change on EmbeddedCheckoutSessionProvider: You cannot change the client secret after setting it. Unmount and create a new instance of EmbeddedCheckoutSessionProvider instead.'
      );
    }

    if (
      prevOptions.onComplete != null &&
      options.onComplete !== prevOptions.onComplete
    ) {
      console.warn(
        'Unsupported prop change on EmbeddedCheckoutSessionProvider: You cannot remove the onComplete option after setting it.'
      );
    }
  }, [prevOptions, options]);

  return (
    <EmbeddedCheckoutContext.Provider value={ctx}>
      {children}
    </EmbeddedCheckoutContext.Provider>
  );
};