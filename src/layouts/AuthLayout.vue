<template>
  <div class="min-h-screen bg-surface lg:grid lg:grid-cols-2">
    <div class="hidden flex-col justify-between bg-navy p-10 text-surface lg:flex">
      <div>
        <p class="font-display text-2xl text-accent-orange">Vislet</p>
        <h2 class="mt-8 text-3xl font-semibold leading-tight text-surface">
          Simplify your visa journey
        </h2>
        <p class="mt-4 max-w-md text-muted">
          Track requirements, upload documents, and manage your application in one place.
        </p>
      </div>
      <p class="text-sm text-muted">Free to use on Firebase Spark tier</p>
    </div>
    <div class="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>
  </div>
</template>
