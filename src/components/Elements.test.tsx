import React from 'react';
import {render, act} from '@testing-library/react';
import {renderHook} from '@testing-library/react-hooks';

import {Elements, useElements, useStripe, ElementsConsumer} from './Elements';
import * as mocks from '../../test/mocks';

describe('Elements', () => {
  let mockStripe: any;
  let mockStripePromise: any;
  let mockElements: any;
  let consoleError: any;
  let consoleWarn: any;

  beforeEach(() => {
    mockStripe = mocks.mockStripe();
    mockStripePromise = Promise.resolve(mockStripe);
    mockElements = mocks.mockElements();
    mockStripe.elements.mockReturnValue(mockElements);

    jest.spyOn(console, 'error');
    jest.spyOn(console, 'warn');
    consoleError = console.error;
    consoleWarn = console.warn;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('injects elements with the useElements hook', () => {
    const wrapper = ({children}: any) => (
      <Elements stripe={mockStripe}>{children}</Elements>
    );

    const {result} = renderHook(() => useElements(), {wrapper});

    expect(result.current).toBe(mockElements);
  });

  test('only creates elements once', () => {
    const TestComponent = () => {
      const _ = useElements();
      return <div />;
    };

    render(
      <Elements stripe={mockStripe}>
        <TestComponent />
      </Elements>
    );

    expect(mockStripe.elements).toHaveBeenCalledTimes(1);
  });

  // TODO(christopher): support Strict Mode first
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('only creates elements once in Strict Mode', () => {
    const TestComponent = () => {
      const _ = useElements();
      return <div />;
    };

    render(
      <React.StrictMode>
        <Elements stripe={mockStripe}>
          <TestComponent />
        </Elements>
      </React.StrictMode>
    );

    expect(mockStripe.elements).toHaveBeenCalledTimes(1);
  });

  test('injects stripe with the useStripe hook', () => {
    const wrapper = ({children}: any) => (
      <Elements stripe={mockStripe}>{children}</Elements>
    );

    const {result} = renderHook(() => useStripe(), {wrapper});

    expect(result.current).toBe(mockStripe);
  });

  test('provides elements and stripe with the ElementsConsumer component', () => {
    expect.assertions(2);

    render(
      <Elements stripe={mockStripe}>
        <ElementsConsumer>
          {(ctx) => {
            expect(ctx.elements).toBe(mockElements);
            expect(ctx.stripe).toBe(mockStripe);

            return null;
          }}
        </ElementsConsumer>
      </Elements>
    );
  });

  test('provides elements and stripe with the ElementsConsumer component in Strict Mode', () => {
    expect.assertions(2);

    render(
      <React.StrictMode>
        <Elements stripe={mockStripe}>
          <ElementsConsumer>
            {(ctx) => {
              expect(ctx.elements).toBe(mockElements);
              expect(ctx.stripe).toBe(mockStripe);

              return null;
            }}
          </ElementsConsumer>
        </Elements>
      </React.StrictMode>
    );
  });

  test('provides given stripe instance on mount', () => {
    const TestComponent = () => {
      const stripe = useStripe();

      if (!stripe) {
        throw new Error('Stripe instance is null');
      }

      return null;
    };

    expect(() => {
      render(
        <Elements stripe={mockStripe}>
          <TestComponent />
        </Elements>
      );
    }).not.toThrow('Stripe instance is null');
  });

  test('allows a transition from null to a valid Stripe object', () => {
    let stripeProp: any = null;
    const wrapper = ({children}: any) => (
      <Elements stripe={stripeProp}>{children}</Elements>
    );

    const {result, rerender} = renderHook(() => useElements(), {wrapper});
    expect(result.current).toBe(null);

    stripeProp = mockStripe;
    rerender();
    expect(result.current).toBe(mockElements);
  });

  test('works with a Promise resolving to a valid Stripe object', async () => {
    const wrapper = ({children}: any) => (
      <Elements stripe={mockStripePromise}>{children}</Elements>
    );

    const {result, waitForNextUpdate} = renderHook(() => useElements(), {
      wrapper,
    });

    expect(result.current).toBe(null);

    await waitForNextUpdate();

    expect(result.current).toBe(mockElements);
  });

  test('allows a transition from null to a valid Promise', async () => {
    let stripeProp: any = null;
    const wrapper = ({children}: any) => (
      <Elements stripe={stripeProp}>{children}</Elements>
    );

    const {result, rerender, waitForNextUpdate} = renderHook(
      () => useElements(),
      {wrapper}
    );
    expect(result.current).toBe(null);

    stripeProp = mockStripePromise;
    rerender();
    expect(result.current).toBe(null);

    await waitForNextUpdate();

    expect(result.current).toBe(mockElements);
  });

  test('does not set context if Promise resolves after Elements is unmounted', async () => {
    // Silence console output so test output is less noisy
    consoleError.mockImplementation(() => {});

    const {unmount} = render(
      <Elements stripe={mockStripePromise}>{null}</Elements>
    );

    unmount();
    await act(() => mockStripePromise);

    expect(consoleError).not.toHaveBeenCalled();
  });

  test('does not allow updates to options after the Stripe Promise is set', async () => {
    // Silence console output so test output is less noisy
    consoleWarn.mockImplementation(() => {});

    const {rerender} = render(
      <Elements stripe={mockStripePromise} options={{foo: 'foo'} as any} />
    );

    rerender(
      <Elements stripe={mockStripePromise} options={{bar: 'bar'} as any} />
    );

    await act(() => mockStripePromise);

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn.mock.calls[0][0]).toContain(
      'Unsupported prop change on Elements'
    );
    expect(mockStripe.elements).toHaveBeenCalledTimes(1);
    expect(mockStripe.elements).toHaveBeenCalledWith({foo: 'foo'});
  });

  // TODO(christopher): support Strict Mode first
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('does not allow updates to options after the Stripe Promise is set in StrictMode', async () => {
    // Silence console output so test output is less noisy
    consoleWarn.mockImplementation(() => {});

    const {rerender} = render(
      <React.StrictMode>
        <Elements stripe={mockStripePromise} options={{foo: 'foo'} as any} />
      </React.StrictMode>
    );

    rerender(
      <React.StrictMode>
        <Elements stripe={mockStripePromise} options={{bar: 'bar'} as any} />
      </React.StrictMode>
    );

    await act(() => mockStripePromise);

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn.mock.calls[0][0]).toContain(
      'Unsupported prop change on Elements'
    );
    expect(mockStripe.elements).toHaveBeenCalledTimes(1);
    expect(mockStripe.elements).toHaveBeenCalledWith({foo: 'foo'});
  });

  test('works with a Promise resolving to null for SSR safety', async () => {
    const nullPromise = Promise.resolve(null);
    const TestComponent = () => {
      const elements = useElements();
      return elements ? <div>not empty</div> : null;
    };

    const {container} = render(
      <Elements stripe={nullPromise}>
        <TestComponent />
      </Elements>
    );

    expect(container).toBeEmpty();

    await act(() => nullPromise.then(() => undefined));
    expect(container).toBeEmpty();
  });

  test('errors when props.stripe is `undefined`', () => {
    // Silence console output so test output is less noisy
    consoleError.mockImplementation(() => {});

    expect(() => render(<Elements stripe={undefined as any} />)).toThrow(
      'Invalid prop `stripe` supplied to `Elements`.'
    );
  });

  test('errors when props.stripe is `false`', () => {
    // Silence console output so test output is less noisy
    consoleError.mockImplementation(() => {});

    expect(() => render(<Elements stripe={false as any} />)).toThrow(
      'Invalid prop `stripe` supplied to `Elements`.'
    );
  });

  test('errors when props.stripe is a string', () => {
    // Silence console output so test output is less noisy
    consoleError.mockImplementation(() => {});

    expect(() => render(<Elements stripe={'wat' as any} />)).toThrow(
      'Invalid prop `stripe` supplied to `Elements`.'
    );
  });

  test('errors when props.stripe is a some other object', () => {
    // Silence console output so test output is less noisy
    consoleError.mockImplementation(() => {});

    expect(() => render(<Elements stripe={{wat: 2} as any} />)).toThrow(
      'Invalid prop `stripe` supplied to `Elements`.'
    );
  });

  test('does not allow changes to a set Stripe object', () => {
    // Silence console output so test output is less noisy
    consoleWarn.mockImplementation(() => {});

    const {rerender} = render(<Elements stripe={mockStripe} />);

    const mockStripe2: any = mocks.mockStripe();
    rerender(<Elements stripe={mockStripe2} />);

    expect(mockStripe.elements.mock.calls).toHaveLength(1);
    expect(mockStripe2.elements.mock.calls).toHaveLength(0);
    expect(consoleWarn).toHaveBeenCalledWith(
      'Unsupported prop change on Elements: You cannot change the `stripe` prop after setting it.'
    );
  });

  test('does not allow changes to options after setting the Stripe object', () => {
    // Silence console output so test output is less noisy
    consoleWarn.mockImplementation(() => {});

    const {rerender} = render(
      <Elements stripe={mockStripe} options={{foo: 'foo'} as any} />
    );

    rerender(<Elements stripe={mockStripe} options={{bar: 'bar'} as any} />);

    expect(mockStripe.elements).toHaveBeenCalledWith({foo: 'foo'});
    expect(mockStripe.elements).toHaveBeenCalledTimes(1);

    expect(consoleWarn).toHaveBeenCalledWith(
      'Unsupported prop change on Elements: You cannot change the `options` prop after setting the `stripe` prop.'
    );
  });

  test('allows options changes before setting the Stripe object', () => {
    const {rerender} = render(
      <Elements stripe={null} options={{foo: 'foo'} as any} />
    );

    rerender(<Elements stripe={mockStripe} options={{bar: 'bar'} as any} />);

    expect(console.warn).not.toHaveBeenCalled();

    rerender(<Elements stripe={mockStripe} options={{bar: 'bar'} as any} />);

    expect(mockStripe.elements).toHaveBeenCalledWith({bar: 'bar'});
  });

  test('throws when trying to call useElements outside of Elements context', () => {
    const {result} = renderHook(() => useElements());

    expect(result.error.message).toBe(
      'Could not find Elements context; You need to wrap the part of your app that calls useElements() in an <Elements> provider.'
    );
  });

  test('throws when trying to call useStripe outside of Elements context', () => {
    const {result} = renderHook(() => useStripe());

    expect(result.error.message).toBe(
      'Could not find Elements context; You need to wrap the part of your app that calls useStripe() in an <Elements> provider.'
    );
  });

  test('throws when trying to mount an <ElementsConsumer> outside of Elements context', () => {
    // Silence console output so test output is less noisy
    consoleError.mockImplementation(() => {});

    const TestComponent = () => {
      return <ElementsConsumer>{() => null}</ElementsConsumer>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'Could not find Elements context; You need to wrap the part of your app that mounts <ElementsConsumer> in an <Elements> provider.'
    );
  });
});