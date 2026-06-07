<route lang="yaml">
meta:
  title: Point of Sale (POS)
  layout: default
</route>

<template>
  <div class="container px-4 py-8 mx-auto">
    <!-- Header -->
    <div class="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-3xl font-bold">Point of Sale (POS)</h1>
        <p class="mt-1 text-base-content/60">Create new transaction for service purchase</p>
      </div>
      <router-link to="/gym/transactions" class="btn btn-ghost">
        <IconArrowLeft class="w-5 h-5 mr-2" />
        Back to Transactions
      </router-link>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Left Column: Service Selection -->
      <div class="lg:col-span-2">
        <!-- Member Selection Card -->
        <div class="mb-6 shadow-xl card bg-base-100">
          <div class="card-body">
            <h2 class="card-title">
              <IconUser class="w-6 h-6" />
              Customer
            </h2>

            <!-- Customer Type Toggle -->
            <div class="flex gap-2 p-1 rounded-lg bg-base-200">
              <button
                class="flex-1 btn btn-sm"
                :class="customerType === 'member' ? 'btn-primary' : 'btn-ghost'"
                @click="setCustomerType('member')"
              >
                <IconUser class="w-4 h-4 mr-1" />
                Member
              </button>
              <button
                class="flex-1 btn btn-sm"
                :class="customerType === 'walk-in' ? 'btn-secondary' : 'btn-ghost'"
                @click="setCustomerType('walk-in')"
              >
                <IconUserPlus class="w-4 h-4 mr-1" />
                Walk-in
              </button>
            </div>

            <!-- Member Flow -->
            <template v-if="customerType === 'member'">
              <!-- Selected Member Display -->
              <div v-if="selectedMember" class="alert alert-success">
                <div class="flex items-center w-full gap-3">
                  <IconCircleCheck class="w-6 h-6" />
                  <div class="flex-1">
                    <div class="font-semibold">{{ selectedMember.firstName }} {{ selectedMember.lastName }}</div>
                    <div class="text-sm opacity-80">{{ selectedMember.email }} | {{ selectedMember.phone }}</div>
                  </div>
                  <button class="btn btn-sm btn-ghost" @click="clearMember">
                    <IconX class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Select Member Button -->
              <button
                v-else
                @click="openMemberModal"
                class="btn btn-outline btn-block"
              >
                <IconUser class="w-5 h-5 mr-2" />
                Select Member
              </button>
            </template>

            <!-- Walk-in Flow -->
            <template v-else>
              <div class="alert alert-info py-2">
                <IconUserPlus class="w-5 h-5 flex-shrink-0" />
                <span class="text-sm">Walk-in customer — no membership required. No Active Service will be created.</span>
              </div>
              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text">Customer Name <span class="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  v-model="walkInName"
                  placeholder="e.g. Andi"
                  class="input input-bordered input-sm w-full"
                  autocomplete="off"
                />
              </div>
            </template>
          </div>
        </div>

        <!-- Service Plans Selection -->
        <div class="shadow-xl card bg-base-100">
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <h2 class="card-title">
                <IconPackage class="w-6 h-6" />
                Select Service Plans
              </h2>
              <div class="form-control">
                <input
                  type="text"
                  placeholder="Search service plans..."
                  class="w-64 input input-bordered input-sm"
                  v-model="planSearchQuery"
                />
              </div>
            </div>

            <!-- Walk-in filter notice -->
            <div v-if="customerType === 'walk-in'" class="alert alert-warning py-2 mb-3 text-sm">
              <IconUserPlus class="w-4 h-4 flex-shrink-0" />
              <span>Hanya menampilkan paket yang diizinkan untuk Walk-in. Tandai paket di <strong>Service Plans</strong> dengan flag <em>Tersedia untuk Walk-in</em>.</span>
            </div>

            <!-- Loading Service Plans -->
            <div v-if="plansLoading" class="flex items-center justify-center py-8">
              <span class="loading loading-spinner loading-lg"></span>
            </div>

            <!-- Service Type Tabs -->
            <div v-else-if="serviceTypes.length > 0" class="w-full">
              <div role="tablist" class="mb-4 tabs tabs-boxed">
                <a
                  v-for="type in serviceTypes"
                  :key="type.value"
                  role="tab"
                  class="tab"
                  :class="{ 'tab-active': activeTab === type.value }"
                  @click="activeTab = type.value"
                >
                  {{ type.label }}
                  <span v-if="type.count > 0" class="ml-2 badge badge-sm">{{ type.count }}</span>
                </a>
              </div>

              <!-- Service Plans Grid -->
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div
                  v-for="plan in filteredPlans"
                  :key="plan.id"
                  class="transition-all cursor-pointer card bg-base-200 hover:bg-base-300"
                  :class="{ 'ring-2 ring-primary': isInCart(plan.id) }"
                  @click="addToCart(plan)"
                >
                  <div class="p-4 card-body">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <h3 class="font-semibold">{{ plan.name }}</h3>
                          <div v-if="plan.isPopular" class="badge badge-warning badge-sm">
                            ⭐ Popular
                          </div>
                        </div>
                        <p class="mt-1 text-sm text-base-content/60 line-clamp-2">{{ plan.description }}</p>
                      </div>
                      <div v-if="isInCart(plan.id)" class="badge badge-primary">
                        <IconCheck class="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div class="flex items-center justify-between mt-3">
                      <div class="text-lg font-bold text-primary">
                        {{ formatCurrency(plan.price) }}
                      </div>
                      <div class="badge badge-sm">
                        {{ formatDuration(plan) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="filteredPlans.length === 0" class="py-8 text-center text-base-content/60">
                <span v-if="customerType === 'walk-in'">Belum ada paket yang ditandai <em>Tersedia untuk Walk-in</em> pada kategori ini</span>
                <span v-else>No service plans available for this category</span>
              </div>

              <!-- Pagination (members-style) -->
              <div v-if="totalPlanPages > 1" class="flex flex-col items-center justify-between gap-4 pt-4 mt-6 border-t sm:flex-row border-base-300">
                <div class="text-sm text-base-content/60">
                  {{ planPaginationInfo }}
                </div>
                <div class="join">
                  <button
                    class="join-item btn btn-sm"
                    :disabled="planPage === 1"
                    @click="changePlanPage(planPage - 1)"
                  >
                    «
                  </button>
                  <button
                    v-for="page in visiblePlanPages"
                    :key="page"
                    class="join-item btn btn-sm"
                    :class="{ 'btn-active': page === planPage }"
                    @click="changePlanPage(page)"
                  >
                    {{ page }}
                  </button>
                  <button
                    class="join-item btn btn-sm"
                    :disabled="planPage === totalPlanPages"
                    @click="changePlanPage(planPage + 1)"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="py-8 text-center text-base-content/60">
              No service plans available
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Cart & Checkout -->
      <div class="lg:col-span-1">
        <div class="shadow-xl card bg-base-100">
          <div class="space-y-4 card-body">
            <!-- Shopping Cart as Collapsible Section -->
            <div class="rounded-lg bg-base-200">
              <div class="flex items-center justify-between p-3 cursor-pointer" @click="cartCollapseOpen = !cartCollapseOpen">
                <div class="flex items-center gap-2">
                  <div class="indicator">
                    <IconShoppingCart class="w-5 h-5" />
                    <span v-if="cart.length > 0" class="indicator-item badge badge-primary badge-xs">{{ totalCartQty }}</span>
                  </div>
                  <div>
                    <p class="font-bold leading-none">Shopping Cart</p>
                    <p class="text-[11px] text-base-content/60" v-if="cart.length > 0">{{ totalCartQty }} item{{ totalCartQty > 1 ? 's' : '' }} • {{ formatCurrency(subtotal) }}</p>
                    <p class="text-[11px] text-base-content/60" v-else>Cart is empty</p>
                  </div>
                </div>
                <button class="btn btn-ghost btn-xs btn-circle" @click.stop="cartCollapseOpen = !cartCollapseOpen">
                  <IconChevronDown class="w-4 h-4 transition-transform" :class="{ 'rotate-180': cartCollapseOpen }" />
                </button>
              </div>
              <div v-show="cartCollapseOpen" class="px-3 pb-3 space-y-2">
                <!-- Clear All Button -->
                <button
                  v-if="cart.length > 0"
                  @click="clearCart"
                  class="w-full btn btn-ghost btn-xs"
                >
                  <IconX class="w-3 h-3" />
                  Clear All
                </button>
                
                <!-- Cart Items -->
                <div v-if="cart.length > 0" class="pr-1 space-y-2 overflow-y-auto max-h-64">
                  <div
                    v-for="(item) in cart"
                    :key="item.servicePlanId"
                    class="p-3 text-sm border rounded-lg bg-base-100 border-base-300"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <p class="font-semibold truncate">{{ item.name }}</p>
                        <p class="text-xs text-base-content/60">{{ formatDuration(item) }}</p>
                      </div>
                      <div class="text-right">
                        <p class="font-bold text-primary">{{ formatCurrency(item.price * (item.quantity || 1)) }}</p>
                        <p v-if="(item.quantity || 1) > 1" class="text-[11px] text-base-content/60">{{ formatCurrency(item.price) }} × {{ item.quantity }}</p>
                      </div>
                    </div>
                    <!-- Quantity Controls -->
                    <div class="flex items-center gap-2 mt-2">
                      <span class="text-xs text-base-content/60">Qty:</span>
                      <div class="flex items-center gap-1">
                        <button
                          class="btn btn-xs btn-circle btn-outline"
                          :disabled="(item.quantity || 1) <= 1"
                          @click="decrementQuantity(item.servicePlanId)"
                        >−</button>
                        <span class="w-8 font-semibold text-center">{{ item.quantity || 1 }}</span>
                        <button
                          class="btn btn-xs btn-circle btn-outline"
                          @click="incrementQuantity(item.servicePlanId)"
                        >+</button>
                      </div>
                    </div>
                    <div class="grid grid-cols-[1fr_auto] gap-2 items-end mt-2">
                      <div class="form-control">
                        <label class="py-1 label">
                          <span class="text-xs label-text">Start Date <span class="text-error">*</span></span>
                        </label>
                        <input
                          type="date"
                          class="w-full input input-bordered input-xs"
                          v-model="item.startDate"
                          :min="today"
                        />
                      </div>
                      <button
                        class="btn btn-error btn-xs h-9"
                        @click="removeFromCart(item.servicePlanId)"
                      >
                        <IconTrash class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div v-else class="py-6 text-center text-base-content/60">
                  <IconShoppingCartOff class="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p class="text-xs">Cart is empty</p>
                </div>
              </div>
            </div>

            <!-- Voucher Section -->
            <div>
              <div class="my-3 divider">Voucher</div>
              
              <!-- Selected Voucher Display (Compact) -->
              <div
                v-if="selectedVoucher"
                :class="[
                  'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                  selectedVoucherValid ? 'bg-success/10 border-success/30' : 'bg-error/10 border-error/30'
                ]"
              >
                <IconTicket
                  :class="[
                    'w-4 h-4 flex-shrink-0 mt-1',
                    selectedVoucherValid ? 'text-success' : 'text-error'
                  ]"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold truncate">{{ selectedVoucher.code }}</div>
                  <div class="flex flex-wrap items-center gap-2 mt-1 text-xs">
                    <span :class="selectedVoucherValid ? 'text-success' : 'text-error'">
                      <span v-if="selectedVoucher.type === 'percentage' || selectedVoucher.discountType === 'percentage'">
                        -{{ selectedVoucher.value || selectedVoucher.discountValue }}%
                        <span v-if="selectedVoucher.maxDiscountAmount" class="text-base-content/60">
                          (max {{ formatCurrency(selectedVoucher.maxDiscountAmount) }})
                        </span>
                      </span>
                      <span v-else>
                        -{{ formatCurrency(selectedVoucher.value || selectedVoucher.discountValue) }}
                      </span>
                    </span>
                    <span class="text-base-content/60">
                      Applicable to:
                      <span class="font-medium text-base-content">
                        {{ getVoucherScopeLabel(selectedVoucher.applicableTo) }}
                      </span>
                    </span>
                  </div>
                  <p
                    v-if="selectedVoucherStatusMessage"
                    :class="['text-xs mt-1', selectedVoucherValid ? 'text-success' : 'text-error']"
                  >
                    {{ selectedVoucherStatusMessage }}
                  </p>
                  <p v-else class="mt-1 text-xs text-base-content/60">
                    {{ selectedVoucherValid ? 'Voucher applied to the current cart' : '' }}
                  </p>
                </div>
                <button class="btn btn-ghost btn-xs btn-circle" @click="clearVoucher">
                  <IconX class="w-3 h-3" />
                </button>
              </div>

              <!-- Select Voucher Button -->
              <button
                v-else
                @click="openVoucherModal"
                class="btn btn-outline btn-sm btn-block"
                :disabled="cart.length === 0"
              >
                <IconTicket class="w-4 h-4 mr-2" />
                Select Voucher
              </button>
            </div>

            <!-- Cart Summary -->
            <div>
              <div class="my-0 divider">Summary (Preview)</div>
              
              <div class="mt-2 space-y-2 text-sm">
                <div class="flex justify-between">
                  <span>Subtotal</span>
                  <span class="font-semibold">{{ formatCurrency(subtotal) }}</span>
                </div>
                <div v-if="selectedVoucher && voucherDiscount > 0" class="flex justify-between text-success">
                  <span>Voucher Discount ({{ selectedVoucher.code }})</span>
                  <span class="font-semibold">-{{ formatCurrency(voucherDiscount) }}</span>
                </div>
                <div class="flex justify-between" :class="taxConfigStatus === 'enabled' ? '' : 'text-base-content/40'">
                  <span>
                    Tax
                    <span v-if="taxConfigStatus === 'enabled'">({{ taxPercentage }}%)</span>
                    <span v-else-if="taxConfigStatus === 'disabled'" class="text-xs italic text-warning">(disabled in settings)</span>
                    <span v-else class="text-xs italic">(not configured)</span>
                  </span>
                  <span class="font-semibold">{{ formatCurrency(taxAmount) }}</span>
                </div>
                <div class="flex justify-between pt-2 text-lg font-bold border-t border-base-300">
                  <span>Estimated Total</span>
                  <span class="text-primary">{{ formatCurrency(total) }}</span>
                </div>
                <div class="mt-2 text-xs italic text-base-content/60">
                  * Final amount will be calculated by system
                </div>
              </div>
            </div>

            <!-- Payment Methods -->
            <div>
              <div class="my-0 divider">Payment Method</div>
              
              <div class="mt-3 space-y-3">
                <div class="flex-col form-control">
                  <label class="label">
                    <span class="label-text">Select Payment Method <span class="text-error">*</span></span>
                  </label>
                  <select
                    class="w-full select select-bordered select-sm"
                    v-model="selectedPaymentMethod"
                    :disabled="cart.length === 0"
                  >
                    <option value="">Choose payment method...</option>
                    <option
                      v-for="method in availablePaymentMethods"
                      :key="method"
                      :value="method"
                    >
                      {{ formatPaymentLabel(method) }}
                    </option>
                  </select>
                </div>
                
                <!-- Payment Amount Input -->
                <div v-if="selectedPaymentMethod" class="flex-col form-control">
                  <label class="label">
                    <span class="label-text">Payment Amount <span class="text-error">*</span></span>
                  </label>
                  <CurrencyInput
                    input-class="w-full input input-bordered input-sm"
                    placeholder="Enter amount"
                    :min="0"
                    :disabled="!isCashPayment"
                    v-model="paymentAmount"
                  />
                  
                  <!-- Change Calculation -->
                  <label class="label">
                    <span v-if="isCashPayment && paymentAmount >= total" class="label-text-alt text-success">
                      Expected change: {{ formatCurrency(paymentAmount - total) }}
                    </span>
                    <span v-else-if="isCashPayment && paymentAmount > 0 && paymentAmount < total" class="label-text-alt text-warning">
                      Amount less than total ({{ formatCurrency(total) }})
                    </span>
                    <span v-else-if="!isCashPayment && selectedPaymentMethod" class="label-text-alt text-base-content/60">
                      Non-cash payments always use the exact total: {{ formatCurrency(total) }}
                    </span>
                    <span v-else class="label-text-alt text-base-content/60">
                      Expected total: {{ formatCurrency(total) }}
                    </span>
                  </label>
                </div>

                <!-- Bank Name (credit_card / debit_card) -->
                <div v-if="BANK_SELECTION_PAYMENT_METHODS.includes(selectedPaymentMethod)" class="flex-col form-control">
                  <label class="label">
                    <span class="label-text">Nama Bank <span class="text-error">*</span></span>
                  </label>
                  <select
                    class="w-full select select-bordered select-sm"
                    :class="{ 'select-error': selectedPaymentMethod && BANK_SELECTION_PAYMENT_METHODS.includes(selectedPaymentMethod) && !paymentBankName }"
                    v-model="paymentBankName"
                  >
                    <option value="">-- Pilih Bank --</option>
                    <option
                      v-for="bank in BANK_OPTIONS"
                      :key="bank.value"
                      :value="bank.value"
                    >
                      {{ bank.label }}
                    </option>
                  </select>
                  <label v-if="selectedPaymentMethod && BANK_SELECTION_PAYMENT_METHODS.includes(selectedPaymentMethod) && !paymentBankName" class="label">
                    <span class="label-text-alt text-error">Pilih bank/kartu terlebih dahulu</span>
                  </label>
                </div>

                <!-- Payment Notes (credit_card / debit_card) -->
                <div v-if="['credit_card', 'debit_card', 'bank_transfer'].includes(selectedPaymentMethod)" class="flex-col form-control">
                  <label class="label">
                    <span class="label-text">Catatan Pembayaran</span>
                  </label>
                  <input
                    type="text"
                    class="w-full input input-bordered input-sm"
                    :placeholder="selectedPaymentMethod === 'debit_card' ? 'Contoh: Debit BCA *4821 a.n. John' : selectedPaymentMethod === 'credit_card' ? 'Contoh: CC Mandiri *9912 a.n. Jane' : 'Contoh: Transfer dari rek 123456789'"
                    v-model="paymentNotes"
                  />
                </div>
              </div>
            </div>
            <div class="flex-col form-control">
              <label class="label">
                <span class="label-text">Notes (Optional)</span>
              </label>
              <textarea
                class="w-full textarea textarea-bordered textarea-sm"
                placeholder="Add transaction notes..."
                rows="2"
                v-model="transactionNotes"
                :disabled="cart.length === 0"
              ></textarea>
            </div>

            <!-- Checkout Button -->
            <div class="tooltip tooltip-top w-full" :data-tip="checkoutDisabledReason">
              <button
                class="btn btn-primary btn-block"
                :disabled="!canCheckout"
                @click="handleCheckout"
              >
                <IconCash class="w-5 h-5" />
                Complete Transaction
              </button>
            </div>
            
            <!-- Helper text when disabled -->
            <div v-if="!canCheckout && checkoutDisabledReason" class="text-xs text-center text-warning mt-1">
              {{ checkoutDisabledReason }}
            </div>

            <button
              v-if="cart.length > 0"
              class="btn btn-ghost btn-sm btn-block"
              @click="clearCart"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Member Selection Modal -->
    <Teleport to="body">
      <dialog ref="memberModal" class="modal">
        <div class="w-11/12 max-w-3xl modal-box">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">{{ showCreateMemberForm ? 'New Member' : 'Select Member' }}</h3>
          <div class="flex items-center gap-2">
            <button
              v-if="!showCreateMemberForm"
              type="button"
              class="btn btn-sm btn-primary"
              @click="showCreateMemberForm = true"
            >
              <IconPlus class="w-4 h-4 mr-1" />
              New Member
            </button>
            <button type="button" @click="closeMemberModal" class="btn btn-sm btn-circle btn-ghost">
              ✕
            </button>
          </div>
        </div>

        <!-- Quick Create Member Form -->
        <div v-if="showCreateMemberForm" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-medium">First Name <span class="text-error">*</span></span></label>
              <input
                v-model="createMemberForm.firstName"
                type="text"
                placeholder="First name"
                class="input input-bordered w-full"
                :class="createMemberErrors.firstName ? 'input-error' : ''"
              />
              <label v-if="createMemberErrors.firstName" class="label py-0">
                <span class="label-text-alt text-error">{{ createMemberErrors.firstName }}</span>
              </label>
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-medium">Last Name <span class="text-error">*</span></span></label>
              <input
                v-model="createMemberForm.lastName"
                type="text"
                placeholder="Last name"
                class="input input-bordered w-full"
                :class="createMemberErrors.lastName ? 'input-error' : ''"
              />
              <label v-if="createMemberErrors.lastName" class="label py-0">
                <span class="label-text-alt text-error">{{ createMemberErrors.lastName }}</span>
              </label>
            </div>
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text font-medium">Phone</span></label>
            <input
              v-model="createMemberForm.phone"
              type="tel"
              placeholder="+628123456789"
              class="input input-bordered w-full"
              :class="createMemberErrors.phone ? 'input-error' : ''"
            />
          </div>
          <div class="form-control">
            <label class="label py-1"><span class="label-text font-medium">Email</span></label>
            <input
              v-model="createMemberForm.email"
              type="email"
              placeholder="email@example.com"
              class="input input-bordered w-full"
            />
            <label v-if="createMemberErrors.phone" class="label py-0">
              <span class="label-text-alt text-error">{{ createMemberErrors.phone }}</span>
            </label>
          </div>
          <div class="alert alert-info py-2 text-sm">
            <span>Phone or email is required. Member can be completed in the Members page later.</span>
          </div>
        </div>

        <!-- Search + List (shown when not creating) -->
        <template v-else>
          <!-- Search -->
          <div class="mb-4 form-control">
            <input
              type="text"
              placeholder="Search member by name, email, or phone..."
              class="w-full input input-bordered"
              v-model="memberSearch"
              @input="handleMemberSearch"
              autocomplete="off"
            />
          </div>

          <!-- Members List -->
          <div class="overflow-y-auto max-h-96">
            <div v-if="membersLoading" class="flex items-center justify-center py-12">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
            <div v-else-if="memberResults.length === 0" class="py-12 text-center text-base-content/60">
              No members found
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="member in memberResults"
                :key="member.id"
                @click="selectMember(member)"
                class="transition-all border cursor-pointer card bg-base-100 border-base-300 hover:border-primary hover:bg-base-200"
              >
                <div class="p-4 card-body">
                  <div class="font-semibold">{{ member.firstName }} {{ member.lastName }}</div>
                  <div class="text-sm text-base-content/60">
                    {{ member.email }} • {{ member.phone }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div class="modal-action">
          <template v-if="showCreateMemberForm">
            <button type="button" class="btn btn-ghost" @click="showCreateMemberForm = false" :disabled="createMemberLoading">Back</button>
            <button type="button" class="btn btn-primary" @click="handleQuickCreateMember" :disabled="createMemberLoading">
              <span v-if="createMemberLoading" class="loading loading-spinner loading-sm"></span>
              <IconPlus v-else class="w-4 h-4 mr-1" />
              Create & Select
            </button>
          </template>
          <button v-else type="button" @click="closeMemberModal" class="btn">Cancel</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeMemberModal">close</button>
      </form>
    </dialog>
    </Teleport>

    <!-- Voucher Selection Modal -->
    <Teleport to="body">
    <dialog ref="voucherModal" class="modal">
      <div class="w-11/12 max-w-3xl modal-box">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Select Voucher</h3>
          <button type="button" @click="closeVoucherModal" class="btn btn-sm btn-circle btn-ghost">
            ✕
          </button>
        </div>

        <!-- Search -->
        <div class="mb-4 form-control">
          <input
            type="text"
            placeholder="Search voucher by code or name..."
            class="w-full input input-bordered"
            v-model="voucherSearch"
            @input="handleVoucherSearch"
            autocomplete="off"
          />
        </div>

        <!-- Vouchers List -->
        <div class="overflow-y-auto max-h-96">
          <div v-if="vouchersLoading" class="flex items-center justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="availableVouchers.length === 0" class="py-12 text-center text-base-content/60">
            No vouchers found
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="voucher in availableVouchers"
              :key="voucher.id"
            >
              <div
                @click="selectVoucher(voucher)"
                class="transition-all border-2 cursor-pointer card bg-base-100"
                :class="errorVoucherId === voucher.id ? 'border-error hover:border-error' : 'border-base-300 hover:border-primary hover:bg-base-200'"
              >
                <div class="p-4 card-body">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <div class="font-semibold">{{ voucher.code }}</div>
                        <div class="badge badge-sm" :class="voucher.isActive ? 'badge-success' : 'badge-error'">
                          {{ voucher.isActive ? 'Active' : 'Inactive' }}
                        </div>
                      </div>
                      <div class="mt-1 text-sm text-base-content/60">{{ voucher.name }}</div>
                      <div class="mt-2 text-xs font-semibold text-success">
                        <span v-if="voucher.type === 'percentage' || voucher.discountType === 'percentage'">
                          {{ voucher.value || voucher.discountValue }}% OFF
                          <span v-if="voucher.maxDiscountAmount" class="text-base-content/60">
                            (max {{ formatCurrency(voucher.maxDiscountAmount) }})
                          </span>
                        </span>
                        <span v-else>
                          {{ formatCurrency(voucher.value || voucher.discountValue) }} OFF
                        </span>
                      </div>
                      <div class="mt-1 text-xs text-base-content/50">
                        <span v-if="voucher.minPurchaseAmount && parseFloat(voucher.minPurchaseAmount) > 0">
                          Min. purchase: {{ formatCurrency(voucher.minPurchaseAmount) }} • 
                        </span>
                        <span v-if="voucher.applicableTo">
                          {{ voucher.applicableTo === 'all' ? 'All items' : voucher.applicableTo === 'membership' ? 'Membership only' : 'Products only' }}
                        </span>
                      </div>
                    </div>
                    <IconTicket class="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>
              
              <!-- Error Message -->
              <div v-if="errorVoucherId === voucher.id && voucherError" class="mt-2 alert alert-error">
                <IconAlertTriangle class="w-5 h-5" />
                <span class="text-sm">{{ voucherError }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" @click="closeVoucherModal" class="btn">Cancel</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeVoucherModal">close</button>
      </form>
    </dialog>
    </Teleport>

    <!-- Processing Modal -->
    <RestaurantProcessingModal
      :show="showProcessingModal"
      :steps="processingSteps"
      :current-step="processingCurrentStep"
      :error="processingError"
      @close-error="stopProcessingSteps(); showProcessingModal = false; processingError = null"
    />

    <!-- Transaction Success Modal -->
    <Teleport to="body">
    <dialog ref="successModal" class="modal">
      <div class="max-w-2xl modal-box">
        <h3 class="mb-4 text-lg font-bold text-success">
          <IconCircleCheck class="inline w-6 h-6 mr-2" />
          Transaction Successful!
        </h3>
        
        <div v-if="transactionResult" class="space-y-4">
          <!-- Transaction Info -->
          <div class="card bg-base-200">
            <div class="p-4 card-body">
              <h4 class="mb-3 font-semibold">Transaction Details</h4>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-base-content/60">Transaction Number</p>
                  <p class="font-mono font-bold">{{ transactionResult.transaction?.transactionNumber }}</p>
                </div>
                <div>
                  <p class="text-base-content/60">Subtotal</p>
                  <p class="font-semibold">{{ formatCurrency(transactionResult.transaction?.subtotal) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60">Tax</p>
                  <p class="font-semibold">{{ formatCurrency(transactionResult.transaction?.taxAmount || 0) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60">Voucher Discount</p>
                  <p class="font-semibold text-success">-{{ formatCurrency(transactionResult.transaction?.voucherDiscount || 0) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60">Total Amount</p>
                  <p class="text-lg font-bold text-primary">{{ formatCurrency(transactionResult.transaction?.totalAmount) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60">Paid Amount</p>
                  <p class="font-semibold">{{ formatCurrency(transactionResult.transaction?.paidAmount) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60">Change</p>
                  <p class="font-semibold text-success">{{ formatCurrency(transactionResult.transaction?.changeAmount || 0) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Services -->
          <div class="card bg-base-200">
            <div class="p-4 card-body">
              <h4 class="mb-3 font-semibold">Active Services ({{ transactionResult.activeServices?.length || 0 }})</h4>
              <div class="space-y-2">
                <div
                  v-for="service in transactionResult.activeServices"
                  :key="service.id"
                  class="flex items-start justify-between p-3 rounded-lg bg-base-100"
                >
                  <div class="flex-1">
                    <div class="font-semibold">{{ service.servicePlan?.name }}</div>
                    <div class="mt-1 text-xs text-base-content/60">
                      {{ service.serviceType }} • {{ formatDate(service.startDate) }} - {{ formatDate(service.endDate) }}
                    </div>
                    <div class="mt-1 text-xs">
                      <span class="badge badge-success badge-xs">{{ service.status }}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-primary">{{ formatCurrency(service.pricePaid) }}</div>
                    <div v-if="parseFloat(service.voucherDiscount) > 0" class="text-xs text-success">
                      -{{ formatCurrency(service.voucherDiscount) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="closeSuccessModal">Close</button>
          <router-link
            :to="`/gym/transactions/${transactionResult?.transaction?.id}`"
            class="btn btn-primary"
            @click="closeSuccessModal"
          >
            View Transaction Details
          </router-link>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
    </Teleport>

    <!-- Toast Notifications -->
    <ToastNotification />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactions } from '@/composables/gym/transactions'
import { useServicePlans } from '@/composables/gym/service-management'
import { useMembers } from '@/composables/gym/member-management'
import { useVouchers } from '@/composables/gym/voucher-management'
import { useCurrency } from '@/composables/core/useCurrency'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/core/useNotification'
import { BANK_OPTIONS, BANK_SELECTION_PAYMENT_METHODS, buildPaymentBankPayload } from '@/utils/paymentBanks'
import CurrencyInput from '@/components/shared/CurrencyInput.vue'
import ToastNotification from '@/components/shared/ToastNotification.vue'
import RestaurantProcessingModal from '@/components/restaurant/shared/RestaurantProcessingModal.vue'
import {
  IconUser,
  IconUserPlus,
  IconSearch,
  IconPackage,
  IconShoppingCart,
  IconShoppingCartOff,
  IconCircleCheck,
  IconX,
  IconCheck,
  IconTrash,
  IconCash,
  IconChevronDown,
  IconArrowLeft,
  IconAlertTriangle,
  IconTicket,
  IconPlus
} from '@tabler/icons-vue'

const router = useRouter()
const { createTransaction } = useTransactions()
const { plans, loading: plansLoading, fetchPlans } = useServicePlans()
const { members, loading: membersLoading, fetchMembers, createMember } = useMembers()
const { vouchers: availableVouchers, loading: vouchersLoading, fetchVouchers, validateVoucher } = useVouchers()
const { formatCurrency } = useCurrency()
const subscriptionStore = useSubscriptionStore()
const authStore = useAuthStore()
const { showNotification } = useNotification()

// Customer Type
const customerType = ref('member') // 'member' | 'walk-in'
const walkInName = ref('')

const setCustomerType = (type) => {
  customerType.value = type
  activeTab.value = 'all'
  planPage.value = 1
  if (type === 'walk-in') {
    // clear member when switching to walk-in
    selectedMember.value = null
    memberSearch.value = ''
    showMemberResults.value = false
  } else {
    // clear walk-in name when switching to member
    walkInName.value = ''
  }
}

// Member Selection
const memberSearch = ref('')
const memberResults = ref([])
const selectedMember = ref(null)
const showMemberResults = ref(false)
const memberModal = ref(null)
let memberSearchTimeout = null

// Quick Create Member
const showCreateMemberForm = ref(false)
const createMemberLoading = ref(false)
const createMemberForm = ref({ firstName: '', lastName: '', phone: '', email: '' })
const createMemberErrors = ref({})

const validateCreateMemberForm = () => {
  const errors = {}
  if (!createMemberForm.value.firstName.trim()) errors.firstName = 'Required'
  if (!createMemberForm.value.lastName.trim()) errors.lastName = 'Required'
  if (!createMemberForm.value.phone.trim() && !createMemberForm.value.email.trim()) {
    errors.phone = 'Phone or email required'
  }
  createMemberErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleQuickCreateMember = async () => {
  if (!validateCreateMemberForm()) return
  createMemberLoading.value = true
  try {
    const payload = {
      firstName: createMemberForm.value.firstName.trim(),
      lastName: createMemberForm.value.lastName.trim(),
    }
    if (createMemberForm.value.phone.trim()) payload.phone = createMemberForm.value.phone.trim()
    if (createMemberForm.value.email.trim()) payload.email = createMemberForm.value.email.trim()
    const result = await createMember(payload)
    const newMember = result.member
    // refresh member list
    await fetchMembers({ page: 1, limit: 100, isActive: 'all' })
    memberResults.value = members.value
    // auto-select new member
    selectMember(newMember)
    showCreateMemberForm.value = false
    createMemberForm.value = { firstName: '', lastName: '', phone: '', email: '' }
  } catch (error) {
    console.error('Failed to create member:', error)
  } finally {
    createMemberLoading.value = false
  }
}

// Service Plans with Pagination
const activeTab = ref('all')
const planPage = ref(1)
const planPageSize = ref(6)
const planSearchQuery = ref('')
const cart = ref([])
const cartCollapseOpen = ref(true)
const voucherCode = ref('')
const selectedVoucher = ref(null)
const voucherSearch = ref('')
const showVoucherResults = ref(false)
const voucherModal = ref(null)
const voucherError = ref(null)
const errorVoucherId = ref(null)
const selectedVoucherValid = ref(false)
const selectedVoucherStatusMessage = ref(null)
const transactionNotes = ref('')
const today = new Date().toISOString().split('T')[0]

// Payment
const selectedPaymentMethod = ref('')
const paymentAmount = ref(0)
const paymentBankName = ref('')
const paymentNotes = ref('')

// Transaction Result
const successModal = ref(null)
const showProcessingModal = ref(false)
const processingError = ref(null)
const processingSteps = ref([])
const processingCurrentStep = ref(0)
const stepTimer = ref(null)

const startProcessingSteps = (steps) => {
  processingSteps.value = steps
  processingCurrentStep.value = 0
  stepTimer.value = setInterval(() => {
    if (processingCurrentStep.value < steps.length - 1) {
      processingCurrentStep.value++
    }
  }, 900)
}

const stopProcessingSteps = () => {
  if (stepTimer.value) {
    clearInterval(stepTimer.value)
    stepTimer.value = null
  }
}

const transactionResult = ref(null)

// Computed
const serviceTypes = computed(() => {
  if (!plans.value || plans.value.length === 0) return []
  
  // Get unique service types
  const types = [...new Set(plans.value.map(p => p.serviceType))]
  
  const typeLabels = {
    'membership': 'Membership',
    'class_package': 'Class Packages',
    'pt_package': 'PT Packages',
    'spa_package': 'Spa Packages',
    'custom': 'Custom Services'
  }
  
  // Filter plans based on search query first  
  let filteredBySearch = plans.value.filter(p => p.isActive)
  // Walk-in: only show walk-in eligible plans
  if (customerType.value === 'walk-in') {
    filteredBySearch = filteredBySearch.filter(p => p.allowWalkIn === true)
  }
  if (planSearchQuery.value.trim()) {
    const search = planSearchQuery.value.toLowerCase().trim()
    filteredBySearch = filteredBySearch.filter(p => 
      p.name.toLowerCase().includes(search) || 
      (p.description && p.description.toLowerCase().includes(search))
    )
  }
  
  const result = [{
    value: 'all',
    label: 'All Services',
    count: filteredBySearch.length
  }]
  
  types.forEach(type => {
    const count = filteredBySearch.filter(p => p.serviceType === type).length
    result.push({
      value: type,
      label: typeLabels[type] || type,
      count
    })
  })
  
  return result
})

const filteredPlans = computed(() => {
  if (!plans.value) return []
  
  let filtered = activeTab.value === 'all' 
    ? plans.value.filter(p => p.isActive)
    : plans.value.filter(p => p.serviceType === activeTab.value && p.isActive)
  
  // Walk-in: only show plans flagged as allowWalkIn
  if (customerType.value === 'walk-in') {
    filtered = filtered.filter(p => p.allowWalkIn === true)
  }

  // Apply search filter
  if (planSearchQuery.value.trim()) {
    const search = planSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(search) || 
      (p.description && p.description.toLowerCase().includes(search))
    )
  }
  
  // Apply pagination
  const start = (planPage.value - 1) * planPageSize.value
  const end = start + planPageSize.value
  return filtered.slice(start, end)
})

const totalPlanPages = computed(() => {
  if (!plans.value) return 1
  
  let filtered = activeTab.value === 'all'
    ? plans.value.filter(p => p.isActive)
    : plans.value.filter(p => p.serviceType === activeTab.value && p.isActive)
  
  if (customerType.value === 'walk-in') {
    filtered = filtered.filter(p => p.allowWalkIn === true)
  }

  // Apply search filter for pagination count
  if (planSearchQuery.value.trim()) {
    const search = planSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(search) || 
      (p.description && p.description.toLowerCase().includes(search))
    )
  }
  
  return Math.ceil(filtered.length / planPageSize.value)
})

// Pagination helpers (styled like members page)
const totalFilteredPlans = computed(() => {
  if (!plans.value) return 0

  let filtered = activeTab.value === 'all'
    ? plans.value.filter(p => p.isActive)
    : plans.value.filter(p => p.serviceType === activeTab.value && p.isActive)

  if (customerType.value === 'walk-in') {
    filtered = filtered.filter(p => p.allowWalkIn === true)
  }

  if (planSearchQuery.value.trim()) {
    const search = planSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.description && p.description.toLowerCase().includes(search))
    )
  }

  return filtered.length
})

const planPaginationInfo = computed(() => {
  const start = (planPage.value - 1) * planPageSize.value + 1
  const end = Math.min(planPage.value * planPageSize.value, totalFilteredPlans.value)
  if (totalFilteredPlans.value === 0) return 'Showing 0 service plans'
  return `Showing ${start}-${end} of ${totalFilteredPlans.value} service plans`
})

const visiblePlanPages = computed(() => {
  const pages = []
  const maxVisible = 5
  let startPage = Math.max(1, planPage.value - Math.floor(maxVisible / 2))
  let endPage = Math.min(totalPlanPages.value, startPage + maxVisible - 1)

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return pages
})

const changePlanPage = (page) => {
  if (!page || page < 1) return
  planPage.value = page
}

const totalCartQty = computed(() =>
  cart.value.reduce((sum, item) => sum + (item.quantity || 1), 0)
)

const subtotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + parseFloat(item.price) * (item.quantity || 1), 0)
})

const taxPercentage = computed(() => {
  const txSettings = authStore.user?.tenant?.settings?.transaction || {}
  const taxEnabled = !!txSettings.taxEnable
  const percentage = parseFloat(txSettings.taxPercentage || 0)
  
  // Only return percentage if tax is enabled
  return taxEnabled ? percentage : 0
})

const voucherDiscount = computed(() => {
  if (!selectedVoucher.value || !selectedVoucherValid.value) return 0
  
  const voucher = selectedVoucher.value
  const baseAmount = subtotal.value
  
  // Use 'type' field instead of 'discountType'
  const voucherType = voucher.type || voucher.discountType
  // Use 'value' field instead of 'discountValue'
  const voucherValue = voucher.value || voucher.discountValue
  
  if (voucherType === 'percentage') {
    const discount = (baseAmount * parseFloat(voucherValue)) / 100
    // Apply maxDiscountAmount if exists (API field: maxDiscountAmount)
    if (voucher.maxDiscountAmount && discount > parseFloat(voucher.maxDiscountAmount)) {
      return parseFloat(voucher.maxDiscountAmount)
    }
    return discount
  } else if (voucherType === 'fixed') {
    return parseFloat(voucherValue)
  }
  
  return 0
})

const taxAmount = computed(() => {
  // Tax calculated after discount: (subtotal - discount) * tax%
  // taxPercentage already handles taxEnable check
  const afterDiscount = subtotal.value - voucherDiscount.value
  return (afterDiscount * taxPercentage.value) / 100
})

// Check tax configuration status
const taxConfigStatus = computed(() => {
  const txSettings = authStore.user?.tenant?.settings?.transaction || {}
  const taxEnabled = !!txSettings.taxEnable
  const percentage = parseFloat(txSettings.taxPercentage || 0)
  
  if (taxEnabled && percentage > 0) return 'enabled'
  if (!taxEnabled && percentage > 0) return 'disabled'
  return 'not-configured'
})

const total = computed(() => {
  // Total = Subtotal - Discount + Tax
  // Tax is calculated on (Subtotal - Discount)
  const finalTotal = subtotal.value - voucherDiscount.value + taxAmount.value
  return finalTotal > 0 ? finalTotal : 0
})

const isCashPayment = computed(() => selectedPaymentMethod.value === 'cash')

const PAYMENT_METHODS_ENUM = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'qris', 'e_wallet', 'compliment']

// Map subscription feature keys to internal payment method values used across the app
const PAYMENT_FEATURE_KEY_MAP = {
  cash: 'cash',
  bankTransfer: 'bank_transfer',
  bank_transfer: 'bank_transfer',
  creditCard: 'credit_card',
  credit_card: 'credit_card',
  debitCard: 'debit_card',
  debit_card: 'debit_card',
  eWallet: 'e_wallet',
  e_wallet: 'e_wallet',
  ewallet: 'e_wallet',
  paymentGateway: 'payment_gateway',
  qris: 'qris',
  compliment: 'compliment',
  card: 'credit_card',
}

const availablePaymentMethods = computed(() => {
  const features = subscriptionStore.features
  if (features && features.payments && typeof features.payments === 'object') {
    const opts = Object.entries(features.payments)
      .filter(([, enabled]) => !!enabled)
      .map(([key]) => PAYMENT_FEATURE_KEY_MAP[key] || key)

    // Deduplicate while preserving order
    const seen = new Set()
    const uniq = []
    for (const v of opts) {
      if (!seen.has(v)) {
        seen.add(v)
        uniq.push(v)
      }
    }
    
    // Always add compliment as an option
    if (!uniq.includes('compliment')) {
      uniq.push('compliment')
    }
    
    if (uniq.length > 0) return uniq
  }

  // Fallback to default enum if subscription features not available
  return PAYMENT_METHODS_ENUM
})

const syncPaymentAmountToTotal = () => {
  if (!selectedPaymentMethod.value) {
    paymentAmount.value = 0
    return
  }

  paymentAmount.value = total.value > 0 ? total.value : 0
}

const canCheckout = computed(() => {
  const customerReady = customerType.value === 'walk-in' ? true : !!selectedMember.value
  const needsBankSelection = BANK_SELECTION_PAYMENT_METHODS.includes(selectedPaymentMethod.value)
  const paymentMatchesTotal = isCashPayment.value
    ? paymentAmount.value >= total.value
    : Math.abs(paymentAmount.value - total.value) < 1

  return cart.value.length > 0 &&
    customerReady &&
    selectedPaymentMethod.value &&
    (!needsBankSelection || !!paymentBankName.value) &&
    paymentAmount.value > 0 &&
    paymentMatchesTotal &&
    cart.value.every(item => item.startDate)
})

const checkoutDisabledReason = computed(() => {
  if (cart.value.length === 0) return 'Add items to cart'
  if (customerType.value === 'member' && !selectedMember.value) return 'Select a member'
  if (!selectedPaymentMethod.value) return 'Select payment method'
  if (BANK_SELECTION_PAYMENT_METHODS.includes(selectedPaymentMethod.value) && !paymentBankName.value) return 'Pilih bank/kartu'
  if (paymentAmount.value <= 0) return 'Enter payment amount'
  if (isCashPayment.value && paymentAmount.value < total.value) return `Payment amount must be at least ${formatCurrency(total.value)}`
  if (!isCashPayment.value && Math.abs(paymentAmount.value - total.value) >= 1) return `Payment amount must match total ${formatCurrency(total.value)}`
  if (!cart.value.every(item => item.startDate)) return 'Set start date for all items'
  return ''
})

const isInCart = (planId) => {
  return cart.value.some(item => item.servicePlanId === planId)
}

// Methods
const formatDuration = (plan) => {
  if (!plan) return '-'
  if (plan.durationType === 'time_based' || plan.duration) {
    return `${plan.duration} days`
  }
  if (plan.durationType === 'session_based' || plan.sessions) {
    return `${plan.sessions} sessions`
  }
  return '-'
}

const formatPaymentLabel = (method) => {
  const labels = {
    cash: 'Tunai',
    credit_card: 'Kartu',
    debit_card: 'Kartu Debit',
    bank_transfer: 'Transfer Bank',
    qris: 'QRIS',
    e_wallet: 'E-Wallet (OVO, GoPay, Dana)',
    compliment: 'Gratis (Compliment)',
  }
  return labels[method] || String(method).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const searchMembers = async () => {
  if (memberSearchTimeout) {
    clearTimeout(memberSearchTimeout)
  }
  
  memberSearchTimeout = setTimeout(async () => {
    if (!memberSearch.value.trim()) {
      showMemberResults.value = false
      return
    }
    
    try {
      const result = await fetchMembers({
        search: memberSearch.value,
        limit: 10,
        isActive: 'all'
      })
      
      memberResults.value = result.data || []
      showMemberResults.value = true
    } catch (error) {
      console.error('Error searching members:', error)
    }
  }, 300)
}

const selectMember = (member) => {
  selectedMember.value = member
  closeMemberModal()
}

const clearMember = () => {
  selectedMember.value = null
  memberSearch.value = ''
  showMemberResults.value = false
}

const openMemberModal = async () => {
  memberSearch.value = ''
  showCreateMemberForm.value = false
  createMemberForm.value = { firstName: '', lastName: '', phone: '', email: '' }
  createMemberErrors.value = {}
  if (members.value.length === 0) {
    await fetchMembers({ page: 1, limit: 100, isActive: 'all' })
  }
  memberResults.value = members.value
  memberModal.value?.showModal()
}

const closeMemberModal = () => {
  memberModal.value?.close()
  memberSearch.value = ''
  showCreateMemberForm.value = false
  createMemberForm.value = { firstName: '', lastName: '', phone: '', email: '' }
  createMemberErrors.value = {}
}

const openVoucherModal = async () => {
  voucherSearch.value = ''
  voucherError.value = null
  errorVoucherId.value = null
  await fetchVouchers({ status: 'active', limit: 100 })
  voucherModal.value?.showModal()
}

const closeVoucherModal = () => {
  voucherModal.value?.close()
  voucherSearch.value = ''
  voucherError.value = null
  errorVoucherId.value = null
}

const handleMemberSearch = (event) => {
  const query = event.target.value.toLowerCase()
  memberSearch.value = query
  
  if (!query) {
    memberResults.value = members.value
    return
  }

  memberResults.value = members.value.filter(member => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    const email = member.email?.toLowerCase() || ''
    const phone = member.phone || ''
    return fullName.includes(query) || email.includes(query) || phone.includes(query)
  })
}

const handleVoucherSearch = (event) => {
  const query = event.target.value.toLowerCase()
  voucherSearch.value = query
  
  if (!query) {
    return
  }

  searchVouchers()
}

const addToCart = (plan) => {
  // If already in cart, increment quantity
  if (isInCart(plan.id)) {
    const existing = cart.value.find(i => i.servicePlanId === plan.id)
    if (existing) existing.quantity = (existing.quantity || 1) + 1
    return
  }
  
  cart.value.push({
    servicePlanId: plan.id,
    name: plan.name,
    price: plan.price,
    quantity: 1,
    duration: plan.duration,
    sessions: plan.sessions,
    durationType: plan.durationType,
    serviceType: plan.serviceType,
    startDate: today
  })
}

const incrementQuantity = (planId) => {
  const item = cart.value.find(i => i.servicePlanId === planId)
  if (item) item.quantity = (item.quantity || 1) + 1
}

const decrementQuantity = (planId) => {
  const item = cart.value.find(i => i.servicePlanId === planId)
  if (item && (item.quantity || 1) > 1) item.quantity--
}

const removeFromCart = (planId) => {
  cart.value = cart.value.filter(item => item.servicePlanId !== planId)
}

const clearCart = () => {
  cart.value = []
  selectedVoucher.value = null
  voucherCode.value = ''
  voucherSearch.value = ''
  transactionNotes.value = ''
  selectedPaymentMethod.value = ''
  paymentAmount.value = 0
  paymentBankName.value = ''
  paymentNotes.value = ''
  cartCollapseOpen.value = false
}

const getCartServiceTypeSummary = () => {
  const types = cart.value.map(item => item.serviceType)
  return {
    types,
    uniqueTypes: [...new Set(types)],
    hasMembership: types.includes('membership'),
    hasClassPackage: types.includes('class_package'),
    hasNonMembership: types.some(type => type && type !== 'membership')
  }
}

const deriveVoucherApplicablePayload = () => {
  const summary = getCartServiceTypeSummary()
  if (summary.uniqueTypes.length === 0) return 'all'
  if (summary.uniqueTypes.length === 1) {
    const onlyType = summary.uniqueTypes[0]
    if (onlyType === 'membership') return 'membership'
    if (onlyType === 'class_package') return 'class_package'
    return 'product'
  }
  return 'mixed'
}

const evaluateVoucherEligibility = (voucher) => {
  if (!voucher) {
    return { isValid: false, reason: 'Voucher data not found' }
  }
  if (cart.value.length === 0) {
    return { isValid: false, reason: 'Add at least one service before applying voucher' }
  }

  const summary = getCartServiceTypeSummary()
  let reason = ''
  const scope = voucher.applicableTo || 'all'

  if (scope === 'membership') {
    if (!summary.hasMembership) {
      reason = 'Voucher only applies to membership services'
    } else if (summary.hasNonMembership) {
      reason = 'Remove non-membership services to use this voucher'
    }
  } else if (scope === 'product') {
    if (!summary.hasNonMembership) {
      reason = 'Voucher applies to non-membership services only'
    } else if (summary.hasMembership) {
      reason = 'Remove membership plans to use this voucher'
    }
  } else if (scope === 'class_package') {
    if (!summary.hasClassPackage) {
      reason = 'Voucher only applies to class packages'
    } else if (summary.uniqueTypes.some(type => type !== 'class_package')) {
      reason = 'Voucher can only be applied when cart contains class packages only'
    }
  }

  if (!reason && Array.isArray(voucher.applicableServiceTypes) && voucher.applicableServiceTypes.length > 0) {
    const invalidType = summary.uniqueTypes.find(type => !voucher.applicableServiceTypes.includes(type))
    if (invalidType) {
      reason = `Voucher not valid for ${invalidType.replace(/_/g, ' ')} services`
    }
  }

  if (!reason && voucher.minPurchaseAmount && subtotal.value < parseFloat(voucher.minPurchaseAmount)) {
    reason = `Minimum purchase ${formatCurrency(parseFloat(voucher.minPurchaseAmount))} required`
  }

  return { isValid: !reason, reason }
}

const resetAll = () => {
  // Clear cart and payment
  clearCart()
  
  // Clear member selection
  selectedMember.value = null
  memberSearch.value = ''
  showMemberResults.value = false
  memberResults.value = []

  // Clear walk-in
  walkInName.value = ''
  customerType.value = 'member'
}

const searchVouchers = async () => {
  if (!voucherSearch.value.trim()) {
    showVoucherResults.value = false
    return
  }
  
  try {
    await fetchVouchers({
      search: voucherSearch.value,
      status: 'active',
      limit: 10
    })
    showVoucherResults.value = true
  } catch (error) {
    console.error('Error searching vouchers:', error)
  }
}

// Validate selected voucher when cart changes
const validateSelectedVoucher = () => {
  if (!selectedVoucher.value) return
  const { isValid, reason } = evaluateVoucherEligibility(selectedVoucher.value)
  selectedVoucherValid.value = isValid
  selectedVoucherStatusMessage.value = isValid ? null : reason
}

const selectVoucher = async (voucher) => {
  // Clear previous error
  voucherError.value = null
  errorVoucherId.value = null
  
  try {
    // Prepare validation data
    const validationData = {
      amount: subtotal.value,
      applicableTo: deriveVoucherApplicablePayload(),
      itemIds: cart.value.map(item => item.servicePlanId)
    }
    
    // Call API validation endpoint
    const response = await validateVoucher(voucher.code, validationData)
    
    // Check if validation passed
    if (response?.data?.validation?.isValid) {
      const eligibility = evaluateVoucherEligibility(voucher)
      if (!eligibility.isValid) {
        voucherError.value = eligibility.reason
        errorVoucherId.value = voucher.id
        return
      }
      
      // Voucher is valid, apply it
      selectedVoucher.value = voucher
      selectedVoucherValid.value = true
      selectedVoucherStatusMessage.value = null
      voucherCode.value = voucher.code
      voucherSearch.value = voucher.code
      closeVoucherModal()
    } else {
      // Validation failed, show error
      const errorMessage = response?.data?.validation?.reason || 'This voucher cannot be applied'
      voucherError.value = errorMessage
      errorVoucherId.value = voucher.id
    }
  } catch (err) {
    // API error, show error message
    voucherError.value = err.message || 'Failed to validate voucher'
    errorVoucherId.value = voucher.id
  }
}

const clearVoucher = () => {
  selectedVoucher.value = null
  selectedVoucherValid.value = false
  selectedVoucherStatusMessage.value = null
  voucherCode.value = ''
  voucherSearch.value = ''
  showVoucherResults.value = false
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getVoucherScopeLabel = (scope) => {
  const scopeMap = {
    membership: 'Membership services',
    product: 'Products & services',
    class_package: 'Class packages'
  }
  return scopeMap[scope] || 'All eligible services'
}

const closeSuccessModal = () => {
  successModal.value?.close()
  transactionResult.value = null
  
  // Reset everything after closing modal
  resetAll()
}

const handleCheckout = async () => {
  if (!canCheckout.value) return
  
  const isWalkIn = customerType.value === 'walk-in'
  processingError.value = null

  const steps = ['Sedang memverifikasi pesanan...']
  const payMethod = selectedPaymentMethod.value
  if (['credit_card', 'debit_card'].includes(payMethod)) {
    steps.push('Sedang memproses pembayaran kartu...')
  } else {
    steps.push('Sedang memproses pembayaran...')
  }
  if (selectedVoucher.value) steps.push('Sedang menambahkan voucher diskon...')
  if (!isWalkIn) steps.push('Sedang apply membership ke member...')
  steps.push('Sedang menyimpan transaksi...')

  startProcessingSteps(steps)
  showProcessingModal.value = true

  try {
    const transactionData = {
      customerType: isWalkIn ? 'non-member' : 'member',
      servicePlans: cart.value.map(item => ({
        servicePlanId: item.servicePlanId,
        startDate: item.startDate,
        quantity: item.quantity || 1
      })),
      paymentMethods: [{
        method: selectedPaymentMethod.value,
        amount: paymentAmount.value,
        ...buildPaymentBankPayload(selectedPaymentMethod.value, paymentBankName.value),
        ...(paymentNotes.value ? { paymentNotes: paymentNotes.value } : {})
      }],
      notes: transactionNotes.value || undefined
    }

    if (isWalkIn) {
      if (walkInName.value.trim()) {
        transactionData.customerName = walkInName.value.trim()
      }
    } else {
      transactionData.memberId = selectedMember.value.id
    }
    
    // Only add voucherCode if a voucher is selected
    if (selectedVoucher.value && voucherCode.value) {
      transactionData.voucherCode = voucherCode.value
    }
    
    const result = await createTransaction(transactionData)
    
    // Store transaction result and show modal
    transactionResult.value = result
    
    // Don't clear cart here, it will be cleared when modal is closed
    
    stopProcessingSteps()
    showProcessingModal.value = false
    // Show success modal
    successModal.value?.showModal()
  } catch (error) {
    console.error('Error creating transaction:', error)
    stopProcessingSteps()
    processingError.value = error?.response?.data?.message || error?.message || 'Terjadi kesalahan, silakan coba lagi.'
  }
}

// Watchers
watch(() => activeTab.value, () => {
  planPage.value = 1 // Reset pagination when changing tab
})

watch(() => planSearchQuery.value, () => {
  planPage.value = 1 // Reset pagination when searching
})

watch(() => cart.value.length, (newLength) => {
  if (newLength === 0) {
    selectedPaymentMethod.value = ''
    paymentAmount.value = 0
    paymentBankName.value = ''
    paymentNotes.value = ''
  }
})

watch(total, (newTotal) => {
  if (newTotal <= 0) {
    paymentAmount.value = 0
    return
  }

  syncPaymentAmountToTotal()
})

watch(selectedPaymentMethod, (newMethod) => {
  if (!newMethod) {
    paymentAmount.value = 0
    return
  }

  if (!BANK_SELECTION_PAYMENT_METHODS.includes(newMethod)) {
    paymentBankName.value = ''
  }

  syncPaymentAmountToTotal()
})

// Lifecycle
onMounted(async () => {
  // Load service plans
  await fetchPlans({
    isActive: 'true',
    limit: 100
  })
  
  // Set first service type as active if available
  if (serviceTypes.value.length > 0) {
    activeTab.value = 'all'
  }
})

// Watch cart changes to revalidate voucher
watch(cart, (newCart, oldCart) => {
  // Only validate if cart actually changed (not just initial load)
  if (oldCart !== undefined) {
    validateSelectedVoucher()
  }
}, { deep: true })

</script>
