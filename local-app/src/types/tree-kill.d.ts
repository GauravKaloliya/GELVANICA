declare module "tree-kill" {
  function kill(pid: number, signal?: string | number, callback?: (err: Error | null) => void): void;
  export = kill;
}
