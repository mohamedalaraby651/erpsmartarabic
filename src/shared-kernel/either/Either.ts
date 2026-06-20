/**
 * Either<L, R> — Algebraic Data Type.
 *
 * MUST NOT be used to carry application errors. Use Result<T, E> for that.
 * Either is reserved for composite / mathematical models within shared-kernel
 * where both sides are equally valid types.
 */

export type Either<L, R> = Left<L> | Right<R>;

export interface Left<L> {
  readonly _tag: "left";
  readonly left: L;
}
export interface Right<R> {
  readonly _tag: "right";
  readonly right: R;
}

export const left = <L>(l: L): Left<L> => ({ _tag: "left", left: l });
export const right = <R>(r: R): Right<R> => ({ _tag: "right", right: r });

export const isLeft = <L, R>(e: Either<L, R>): e is Left<L> => e._tag === "left";
export const isRight = <L, R>(e: Either<L, R>): e is Right<R> =>
  e._tag === "right";
