import parseArgs from 'https://deno.land/x/deno_minimist@v1.0.2/mod.ts'

console.log(parseArgs(Deno.args))
console.log(Deno.args)

const drop = Deno.args.includes('--drop')
const create = Deno.args.includes('--create')


console.log('drop', drop)
console.log('create', create)
