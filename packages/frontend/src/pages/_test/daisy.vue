<route lang="yaml">
meta:
  title: DaisyUI Test
  layout: default
</route>

<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold mb-8">DaisyUI Components Test</h1>
    
    <!-- Buttons -->
    <div class="mb-8">
      <h2 class="text-xl font-bold mb-4">Buttons</h2>
      <div class="flex gap-2">
        <button class="btn">Default</button>
        <button class="btn btn-primary">Primary</button>
        <button class="btn btn-secondary">Secondary</button>
        <button class="btn btn-accent">Accent</button>
      </div>
    </div>

    <!-- Checkboxes -->
    <div class="mb-8">
      <h2 class="text-xl font-bold mb-4">Checkboxes</h2>
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-2">
          <input type="checkbox" class="checkbox" checked />
          <span>Default checkbox</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" class="checkbox checkbox-primary" checked />
          <span>Primary checkbox</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" class="checkbox checkbox-secondary" checked />
          <span>Secondary checkbox</span>
        </label>
      </div>
    </div>

    <!-- Toggle -->
    <div class="mb-8">
      <h2 class="text-xl font-bold mb-4">Toggle Switches</h2>
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-2">
          <input type="checkbox" class="toggle" checked />
          <span>Default toggle</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" class="toggle toggle-primary" checked />
          <span>Primary toggle</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" class="toggle toggle-success" checked />
          <span>Success toggle</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" class="toggle toggle-warning" checked />
          <span>Warning toggle</span>
        </label>
      </div>
    </div>

    <!-- Cards -->
    <div class="mb-8">
      <h2 class="text-xl font-bold mb-4">Card</h2>
      <div class="card w-96 bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Card Title</h2>
          <p>This is a test card with DaisyUI styling</p>
          <div class="card-actions justify-end">
            <button class="btn btn-primary">Action</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
