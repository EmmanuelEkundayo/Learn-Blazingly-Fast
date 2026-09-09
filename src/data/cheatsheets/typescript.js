const typescript = {
  id: 'typescript',
  title: 'TypeScript',
  color: 'blue',
  category: 'Languages',
  description: 'Static typing, interfaces, generics, and utility types for JavaScript',
  sections: [
    {
      title: 'Basic Types',
      items: [
        {
          label: 'Primitive type annotations',
          language: 'typescript',
          code: `let name: string = 'Alice'
let age: number = 30
let active: boolean = true
let nothing: null = null
let missing: undefined = undefined`,
          note: 'Type annotations are optional when TypeScript can infer the type from the assigned value'
        },
        {
          label: 'any and unknown',
          language: 'typescript',
          code: `let flexible: any = 'hello'
flexible = 42           // no error
flexible.foo()          // no error - unsafe

let safe: unknown = 'hello'
// safe.toUpperCase()   // error - must narrow first
if (typeof safe === 'string') {
  safe.toUpperCase()    // ok after narrowing
}`,
          note: 'Prefer unknown over any - it forces you to narrow the type before use'
        },
        {
          label: 'never and void',
          language: 'typescript',
          code: `function throwError(msg: string): never {
  throw new Error(msg)
  // never returns - never is the return type
}

function logMessage(msg: string): void {
  console.log(msg)
  // returns undefined implicitly
}`,
          note: 'never is used for functions that never return (throw or infinite loop). void is for functions with no meaningful return'
        },
        {
          label: 'Arrays and tuples',
          language: 'typescript',
          code: `// Arrays - two equivalent syntaxes
const nums: number[] = [1, 2, 3]
const strs: Array<string> = ['a', 'b']

// Tuples - fixed-length, typed positions
const pair: [string, number] = ['age', 30]
const triple: [string, number, boolean] = ['ok', 1, true]

// Named tuple elements (TS 4.0+)
const point: [x: number, y: number] = [10, 20]`,
          note: 'Tuples are useful for fixed-structure return values like [data, error] pairs'
        },
        {
          label: 'Object type annotations',
          language: 'typescript',
          code: `// Inline object type
function greet(user: { name: string; age: number }): string {
  return \`Hello \${user.name}\`
}

// Optional properties with ?
function configure(opts: { timeout?: number; retries?: number }) {
  const timeout = opts.timeout ?? 5000
}`,
        },
        {
          label: 'Type assertions',
          language: 'typescript',
          code: `const input = document.getElementById('email') as HTMLInputElement
input.value = 'test@example.com'

// Alternative angle-bracket syntax (not valid in .tsx files)
const el = <HTMLInputElement>document.getElementById('email')

// Double assertion to force a type (use sparingly)
const forced = unknownValue as unknown as string`,
          note: 'Use type assertions only when you know more than TypeScript does - they bypass type checking'
        }
      ]
    },
    {
      title: 'Interfaces',
      items: [
        {
          label: 'Declare an interface',
          language: 'typescript',
          code: `interface User {
  id: number
  name: string
  email: string
}

const user: User = { id: 1, name: 'Alice', email: 'alice@example.com' }`,
        },
        {
          label: 'Optional and readonly properties',
          language: 'typescript',
          code: `interface Config {
  readonly apiUrl: string   // cannot be reassigned after creation
  timeout?: number          // optional - may be undefined
  retries?: number
}

const config: Config = { apiUrl: 'https://api.example.com' }
// config.apiUrl = 'other'  // error - readonly`,
          note: 'Use readonly for values that should not change after object creation'
        },
        {
          label: 'Extending interfaces',
          language: 'typescript',
          code: `interface Animal {
  name: string
  age: number
}

interface Dog extends Animal {
  breed: string
  bark(): void
}

// Extend multiple interfaces
interface ServiceDog extends Dog, Animal {
  certificationId: string
}`,
        },
        {
          label: 'Implementing an interface in a class',
          language: 'typescript',
          code: `interface Serializable {
  serialize(): string
  deserialize(data: string): void
}

class UserModel implements Serializable {
  constructor(public name: string) {}

  serialize(): string {
    return JSON.stringify({ name: this.name })
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data)
    this.name = parsed.name
  }
}`,
        },
        {
          label: 'Index signatures',
          language: 'typescript',
          code: `interface StringMap {
  [key: string]: string
}

const headers: StringMap = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer token123'
}

// Mixed: known + dynamic properties
interface FlexibleObj {
  id: number
  [key: string]: unknown
}`,
          note: 'Index signatures allow objects to have arbitrary keys, but all values must match the signature type'
        },
        {
          label: 'Interface declaration merging',
          language: 'typescript',
          code: `interface Window {
  myPlugin: () => void
}

// TypeScript merges both declarations
// Now window.myPlugin is valid
window.myPlugin = () => console.log('plugin loaded')`,
          note: 'Declaration merging is the key difference between interfaces and type aliases - useful for extending third-party types'
        }
      ]
    },
    {
      title: 'Type Aliases',
      items: [
        {
          label: 'Basic type alias',
          language: 'typescript',
          code: `type UserId = number
type Username = string
type Callback = (event: MouseEvent) => void

const id: UserId = 42
const onClick: Callback = (e) => console.log(e.target)`,
        },
        {
          label: 'Union types',
          language: 'typescript',
          code: `type StringOrNumber = string | number
type Status = 'idle' | 'loading' | 'success' | 'error'
type Nullish = null | undefined

function format(value: StringOrNumber): string {
  return String(value)
}

let status: Status = 'loading'`,
          note: 'String literal unions are excellent for state machines and constrained values'
        },
        {
          label: 'Intersection types',
          language: 'typescript',
          code: `type Named = { name: string }
type Aged = { age: number }
type Person = Named & Aged

const person: Person = { name: 'Alice', age: 30 }

// Combining utility types
type AdminUser = User & { role: 'admin'; permissions: string[] }`,
          note: 'Intersection types combine multiple types - the result must satisfy all of them'
        },
        {
          label: 'Template literal types',
          language: 'typescript',
          code: `type Direction = 'left' | 'right' | 'up' | 'down'
type Arrow = \`arrow-\${Direction}\`
// type Arrow = "arrow-left" | "arrow-right" | "arrow-up" | "arrow-down"

type EventName = \`on\${Capitalize<string>}\`
// matches "onClick", "onChange", etc.

type CSSProperty = \`padding-\${'top' | 'right' | 'bottom' | 'left'}\``,
          note: 'Template literal types generate string literal unions and are extremely powerful for typed APIs'
        },
        {
          label: 'Conditional types',
          language: 'typescript',
          code: `type IsArray<T> = T extends any[] ? true : false

type A = IsArray<string[]>  // true
type B = IsArray<string>    // false

// Practical: extract array element type
type ElementType<T> = T extends (infer U)[] ? U : never
type Str = ElementType<string[]>  // string`,
          note: 'Conditional types act like ternary operators at the type level'
        },
        {
          label: 'Mapped types',
          language: 'typescript',
          code: `type Flags<T> = {
  [K in keyof T]: boolean
}

interface Features {
  darkMode: string
  notifications: string
}

type FeatureFlags = Flags<Features>
// { darkMode: boolean; notifications: boolean }

// Make all properties optional
type Optional<T> = { [K in keyof T]?: T[K] }`,
        }
      ]
    },
    {
      title: 'Generics',
      items: [
        {
          label: 'Generic functions',
          language: 'typescript',
          code: `function identity<T>(value: T): T {
  return value
}

const str = identity<string>('hello')  // explicit
const num = identity(42)               // inferred: number

function first<T>(arr: T[]): T | undefined {
  return arr[0]
}`,
        },
        {
          label: 'Generic interfaces and types',
          language: 'typescript',
          code: `interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

const res: ApiResponse<User[]> = {
  data: [],
  status: 200,
  message: 'ok'
}`,
          note: 'Generic defaults (E = Error) let callers omit the type argument when the default applies'
        },
        {
          label: 'Generic constraints with extends',
          language: 'typescript',
          code: `function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { id: 1, name: 'Alice' }
const name = getProperty(user, 'name')  // string
// getProperty(user, 'missing')          // error

function hasLength<T extends { length: number }>(value: T): number {
  return value.length
}`,
          note: 'Constraints prevent calling generic functions with types that lack required properties'
        },
        {
          label: 'Generic classes',
          language: 'typescript',
          code: `class Stack<T> {
  private items: T[] = []

  push(item: T): void {
    this.items.push(item)
  }

  pop(): T | undefined {
    return this.items.pop()
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1]
  }
}

const stack = new Stack<number>()
stack.push(1)
stack.push(2)`,
        },
        {
          label: 'Multiple type parameters',
          language: 'typescript',
          code: `function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((item, i) => [item, b[i]])
}

const zipped = zip([1, 2, 3], ['a', 'b', 'c'])
// [[1, 'a'], [2, 'b'], [3, 'c']]

function merge<T extends object, U extends object>(t: T, u: U): T & U {
  return { ...t, ...u }
}`,
        },
        {
          label: 'infer keyword in conditional types',
          language: 'typescript',
          code: `type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

function fetchUser(): Promise<User> { /* ... */ }

type Resolved = ReturnType<typeof fetchUser>  // Promise<User>

// Unwrap promise
type Awaited<T> = T extends Promise<infer U> ? U : T
type UserData = Awaited<Promise<User>>  // User`,
          note: 'infer lets TypeScript extract and name a type from within a conditional type pattern'
        }
      ]
    },
    {
      title: 'Enums',
      items: [
        {
          label: 'Numeric enum',
          language: 'typescript',
          code: `enum Direction {
  Up,    // 0
  Down,  // 1
  Left,  // 2
  Right  // 3
}

const move = Direction.Up
console.log(move)           // 0
console.log(Direction[0])   // "Up" - reverse mapping`,
          note: 'Numeric enums support reverse mapping - you can look up the name from the number'
        },
        {
          label: 'String enum',
          language: 'typescript',
          code: `enum Status {
  Idle = 'IDLE',
  Loading = 'LOADING',
  Success = 'SUCCESS',
  Error = 'ERROR'
}

function handleStatus(status: Status) {
  if (status === Status.Loading) {
    console.log('Loading...')
  }
}`,
          note: 'String enums are more readable in logs and network payloads than numeric enums'
        },
        {
          label: 'Const enum (inlined at compile time)',
          language: 'typescript',
          code: `const enum Color {
  Red = 'RED',
  Green = 'GREEN',
  Blue = 'BLUE'
}

const c = Color.Red
// Compiled to: const c = "RED"
// No object is emitted - values are inlined`,
          note: 'const enums produce no runtime code - the values are substituted directly in the output'
        },
        {
          label: 'Enum with custom numeric values',
          language: 'typescript',
          code: `enum HttpStatus {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500
}

function isSuccess(status: HttpStatus): boolean {
  return status >= 200 && status < 300
}`,
        },
        {
          label: 'Using enums as types',
          language: 'typescript',
          code: `enum Permission {
  Read = 'READ',
  Write = 'WRITE',
  Admin = 'ADMIN'
}

interface UserRole {
  userId: number
  permissions: Permission[]
}

const role: UserRole = {
  userId: 1,
  permissions: [Permission.Read, Permission.Write]
}`,
        }
      ]
    },
    {
      title: 'Utility Types',
      items: [
        {
          label: 'Partial and Required',
          language: 'typescript',
          code: `interface User {
  id: number
  name: string
  email: string
}

// All properties become optional
type PartialUser = Partial<User>
function updateUser(id: number, changes: Partial<User>) { /* ... */ }

// All properties become required (removes ?)
type RequiredUser = Required<PartialUser>`,
          note: 'Partial is extremely common for update/patch functions'
        },
        {
          label: 'Pick and Omit',
          language: 'typescript',
          code: `interface User {
  id: number
  name: string
  email: string
  password: string
  createdAt: Date
}

// Keep only specified keys
type PublicUser = Pick<User, 'id' | 'name' | 'email'>

// Remove specified keys
type UserWithoutPassword = Omit<User, 'password'>
type UserSummary = Omit<User, 'password' | 'createdAt'>`,
          note: 'Omit is useful for removing sensitive fields before sending data to clients'
        },
        {
          label: 'Record',
          language: 'typescript',
          code: `// Record<Keys, Value>
type ScoreBoard = Record<string, number>
const scores: ScoreBoard = { alice: 95, bob: 87 }

// Record with literal key union
type StatusMessages = Record<'idle' | 'loading' | 'error', string>
const messages: StatusMessages = {
  idle: 'Ready',
  loading: 'Please wait...',
  error: 'Something went wrong'
}`,
        },
        {
          label: 'Readonly',
          language: 'typescript',
          code: `interface Config {
  apiUrl: string
  timeout: number
}

const config: Readonly<Config> = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
}

// config.apiUrl = 'other'  // error - all properties are readonly

// Deep readonly (manual)
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> }`,
        },
        {
          label: 'ReturnType and Parameters',
          language: 'typescript',
          code: `function createUser(name: string, age: number): User {
  return { id: Date.now(), name, age }
}

type CreateUserReturn = ReturnType<typeof createUser>  // User
type CreateUserParams = Parameters<typeof createUser>  // [string, number]

// Useful for wrapping functions
function withLogging<T extends (...args: any[]) => any>(fn: T) {
  return (...args: Parameters<T>): ReturnType<T> => {
    console.log('calling', fn.name)
    return fn(...args)
  }
}`,
          note: 'ReturnType and Parameters are invaluable when wrapping or decorating functions'
        },
        {
          label: 'Awaited, Extract, Exclude, NonNullable',
          language: 'typescript',
          code: `// Awaited - unwraps Promise type
type Data = Awaited<Promise<string[]>>  // string[]

// Extract - keep types assignable to U
type NumberOrString = Extract<string | number | boolean, string | number>
// string | number

// Exclude - remove types assignable to U
type NotString = Exclude<string | number | boolean, string>
// number | boolean

// NonNullable - remove null and undefined
type Safe = NonNullable<string | null | undefined>  // string`,
        }
      ]
    },
    {
      title: 'Union and Intersection Types',
      items: [
        {
          label: 'Union type basics',
          language: 'typescript',
          code: `type Input = string | number | boolean

function stringify(value: Input): string {
  return String(value)
}

// Narrowing required to access type-specific members
function double(value: string | number): string | number {
  if (typeof value === 'number') return value * 2
  return value.repeat(2)
}`,
        },
        {
          label: 'Discriminated unions',
          language: 'typescript',
          code: `type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':      return Math.PI * shape.radius ** 2
    case 'rectangle':   return shape.width * shape.height
    case 'triangle':    return 0.5 * shape.base * shape.height
  }
}`,
          note: 'Discriminated unions use a shared literal property (kind/type/tag) so TypeScript can narrow exhaustively'
        },
        {
          label: 'Exhaustiveness checking',
          language: 'typescript',
          code: `type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset'; value: number }

function assertNever(x: never): never {
  throw new Error('Unexpected value: ' + x)
}

function reduce(state: number, action: Action): number {
  switch (action.type) {
    case 'increment': return state + 1
    case 'decrement': return state - 1
    case 'reset':     return action.value
    default:          return assertNever(action)  // compile error if a case is missing
  }
}`,
          note: 'The assertNever pattern causes a compile error if you add a new union member and forget to handle it'
        },
        {
          label: 'Intersection types',
          language: 'typescript',
          code: `type Timestamped = { createdAt: Date; updatedAt: Date }
type SoftDeletable = { deletedAt: Date | null }

type AuditedEntity = Timestamped & SoftDeletable

interface UserBase { id: number; name: string }
type AdminUser = UserBase & { role: 'admin'; canDelete: boolean }`,
        },
        {
          label: 'Narrowing with unions',
          language: 'typescript',
          code: `type ApiResult = { success: true; data: User } | { success: false; error: string }

function handleResult(result: ApiResult) {
  if (result.success) {
    console.log(result.data.name)  // data is available
  } else {
    console.log(result.error)      // error is available
  }
}`,
        }
      ]
    },
    {
      title: 'Type Guards',
      items: [
        {
          label: 'typeof type guard',
          language: 'typescript',
          code: `function format(value: string | number | boolean): string {
  if (typeof value === 'string') return value.toUpperCase()
  if (typeof value === 'number') return value.toFixed(2)
  return String(value)
}`,
          note: 'typeof narrows to "string" | "number" | "boolean" | "symbol" | "bigint" | "object" | "function" | "undefined"'
        },
        {
          label: 'instanceof type guard',
          language: 'typescript',
          code: `class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

function handleError(err: unknown) {
  if (err instanceof ApiError) {
    console.log(err.statusCode)  // statusCode available
  } else if (err instanceof Error) {
    console.log(err.message)
  } else {
    console.log('Unknown error')
  }
}`,
        },
        {
          label: 'in operator type guard',
          language: 'typescript',
          code: `interface Cat { meow(): void }
interface Dog { bark(): void }

function makeSound(animal: Cat | Dog) {
  if ('meow' in animal) {
    animal.meow()  // Cat
  } else {
    animal.bark()  // Dog
  }
}

// Also works with optional properties
type Admin = { role: 'admin'; permissions: string[] }
type User = { role: 'user' }
function isAdmin(u: Admin | User): u is Admin {
  return 'permissions' in u
}`,
          note: 'The in operator checks if an object has a property - useful when types share some but not all properties'
        },
        {
          label: 'Custom type predicates',
          language: 'typescript',
          code: `// Return type "value is Type" tells TypeScript the narrowed type
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  )
}

const data: unknown = fetchData()
if (isUser(data)) {
  console.log(data.name)  // TypeScript knows data is User
}`,
          note: 'Type predicates are the return type "value is T" - they narrow the type in the if block for callers'
        },
        {
          label: 'Assertion functions',
          language: 'typescript',
          code: `function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== 'string') {
    throw new Error('Expected string, got ' + typeof val)
  }
}

function processInput(input: unknown) {
  assertIsString(input)
  // After the assertion, input is narrowed to string
  console.log(input.toUpperCase())
}`,
          note: 'Assertion functions narrow types for the rest of the function scope, not just an if block'
        },
        {
          label: 'Nullish narrowing',
          language: 'typescript',
          code: `function greet(name: string | null | undefined): string {
  if (name == null) {
    // catches both null and undefined
    return 'Hello, guest'
  }
  return \`Hello, \${name}\`
}

// Optional chaining + nullish coalescing
const len = name?.length ?? 0`,
        }
      ]
    },
    {
      title: 'Decorators',
      items: [
        {
          label: 'Class decorator',
          language: 'typescript',
          code: `// Enable in tsconfig: "experimentalDecorators": true
function sealed(constructor: Function) {
  Object.seal(constructor)
  Object.seal(constructor.prototype)
}

@sealed
class BankAccount {
  constructor(public balance: number) {}
}`,
          note: 'Class decorators receive the constructor function and can replace or augment it'
        },
        {
          label: 'Method decorator',
          language: 'typescript',
          code: `function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value
  descriptor.value = function (...args: any[]) {
    console.log(\`Calling \${key} with\`, args)
    const result = original.apply(this, args)
    console.log(\`\${key} returned\`, result)
    return result
  }
  return descriptor
}

class Calculator {
  @log
  add(a: number, b: number): number {
    return a + b
  }
}`,
          note: 'Method decorators receive the class prototype, method name, and property descriptor'
        },
        {
          label: 'Property decorator',
          language: 'typescript',
          code: `function readonly(target: any, key: string) {
  Object.defineProperty(target, key, {
    writable: false,
    configurable: false
  })
}

class Config {
  @readonly
  apiVersion = 'v2'
}`,
        },
        {
          label: 'Parameter decorator',
          language: 'typescript',
          code: `function validate(target: any, method: string, paramIndex: number) {
  console.log(\`Validate param \${paramIndex} of \${method}\`)
}

class UserService {
  createUser(@validate name: string, age: number) {
    return { name, age }
  }
}`,
          note: 'Parameter decorators are often used for dependency injection frameworks like NestJS'
        },
        {
          label: 'Decorator factory (decorator with arguments)',
          language: 'typescript',
          code: `function MinLength(min: number) {
  return function (target: any, key: string) {
    let value: string = target[key]
    Object.defineProperty(target, key, {
      get: () => value,
      set: (newVal: string) => {
        if (newVal.length < min) throw new Error(\`\${key} must be at least \${min} chars\`)
        value = newVal
      }
    })
  }
}

class Form {
  @MinLength(3)
  username: string = ''
}`,
          note: 'A decorator factory is a function that returns a decorator - this allows passing arguments'
        }
      ]
    },
    {
      title: 'tsconfig Options',
      items: [
        {
          label: 'Strictness options',
          language: 'typescript',
          code: `// tsconfig.json
{
  "compilerOptions": {
    "strict": true,               // enables all strict checks below
    "noImplicitAny": true,        // error on implicit any type
    "strictNullChecks": true,     // null/undefined not assignable to other types
    "strictFunctionTypes": true,  // stricter function type checking
    "strictBindCallApply": true,  // type-checks bind/call/apply
    "noUncheckedIndexedAccess": true  // array access returns T | undefined
  }
}`,
          note: 'Always start new projects with "strict": true - it catches far more bugs at compile time'
        },
        {
          label: 'Target and module',
          language: 'typescript',
          code: `{
  "compilerOptions": {
    "target": "ES2020",     // output JS version: ES5, ES6, ES2020, ESNext
    "module": "ESNext",     // module system: CommonJS, ESNext, AMD
    "moduleResolution": "bundler",  // how imports are resolved
    "lib": ["ES2020", "DOM"]        // included type definitions
  }
}`,
          note: 'For Node.js use "module": "CommonJS" or "NodeNext". For bundlers (Vite/webpack) use "ESNext"'
        },
        {
          label: 'Path aliases',
          language: 'typescript',
          code: `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}

// Now you can import like:
// import { Button } from '@components/Button'`,
          note: 'Path aliases must also be configured in your bundler (Vite, webpack) - tsconfig alone is not enough'
        },
        {
          label: 'Output and source maps',
          language: 'typescript',
          code: `{
  "compilerOptions": {
    "outDir": "./dist",       // compiled output directory
    "rootDir": "./src",       // source root (mirrors structure in outDir)
    "sourceMap": true,        // generate .map files for debugging
    "declaration": true,      // generate .d.ts files
    "declarationDir": "./types"
  }
}`,
        },
        {
          label: 'include, exclude, and references',
          language: 'typescript',
          code: `{
  "compilerOptions": {
    "composite": true   // required for project references
  },
  "include": ["src/**/*", "types/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "references": [
    { "path": "../shared" }   // project references for monorepos
  ]
}`,
          note: 'Project references allow incremental builds in monorepos and compile only what has changed'
        },
        {
          label: 'Useful additional flags',
          language: 'typescript',
          code: `{
  "compilerOptions": {
    "esModuleInterop": true,       // allows default import of CommonJS modules
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,     // allows importing .json files
    "skipLibCheck": true,          // skip type checking of .d.ts files
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,        // error on unused variables
    "noUnusedParameters": true,    // error on unused function params
    "noImplicitReturns": true      // all code paths must return a value
  }
}`,
          note: 'noUnusedLocals and noUnusedParameters help keep code clean but can be noisy during active development'
        }
      ]
    }
  ]
}

export default typescript
