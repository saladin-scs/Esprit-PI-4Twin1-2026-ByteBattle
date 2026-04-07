/**
 * Compose plusieurs HOCs en une seule fonction.
 * compose(a, b, c)(Component) => a(b(c(Component)))
 */
import { ComponentType } from 'react';

type HOC = <P extends object>(C: ComponentType<P>) => ComponentType<P>;

export function compose(...hocs: HOC[]): HOC {
  return function composed<P extends object>(Component: ComponentType<P>): ComponentType<P> {
    return hocs.reduceRight<ComponentType<P>>((Acc, hoc) => hoc(Acc), Component);
  };
}
