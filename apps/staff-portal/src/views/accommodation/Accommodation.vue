<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import Swal from "sweetalert2";
import { apiService } from "../../services/api";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const activeTab = ref("applications");
const loading = ref(false);
const applications = ref([]);
const total = ref(0);
const sessions = ref([]);
const inventory = reactive({ hostels: [], blocks: [], rooms: [] });
const filters = reactive({
  sessionId: "",
  status: "",
  applicantType: "",
  page: 1,
  limit: 25,
});
const hostelForm = reactive({
  name: "",
  gender: "female",
  description: "",
  active: true,
});
const blockForm = reactive({
  hostelId: "",
  name: "Block A",
  residentType: "internal",
  allocationOrder: 1,
  active: true,
});
const roomForm = reactive({
  blockId: "",
  name: "A1",
  capacity: 8,
  allocationOrder: 1,
  active: true,
});
const canConfigure = computed(() =>
  auth.hasPermission("accommodation", "configure"),
);
const canAllocate = computed(() =>
  auth.hasPermission("accommodation", "allocate"),
);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / filters.limit)),
);

function message(error) {
  return error?.message || "The request could not be completed";
}
function recordId(record) {
  return String(record?._id || record || "");
}
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
async function loadApplications() {
  loading.value = true;
  try {
    const result = await apiService.getAccommodationApplications(filters);
    applications.value = result.items || result.data?.items || [];
    total.value = result.total || result.data?.total || 0;
  } catch (error) {
    await Swal.fire("Could not load applications", message(error), "error");
  } finally {
    loading.value = false;
  }
}
async function loadInventory() {
  try {
    const result = await apiService.getAccommodationInventory(
      filters.sessionId,
    );
    const data = result.data || result;
    Object.assign(inventory, data);
  } catch (error) {
    await Swal.fire("Could not load inventory", message(error), "error");
  }
}
async function loadSessions() {
  const response = await apiService.getAcademicSessions({
    limit: 100,
    sortBy: "startDate",
    sortOrder: "desc",
  });
  sessions.value = response.data?.sessions || response.sessions || [];
  if (!filters.sessionId)
    filters.sessionId =
      sessions.value.find((session) => session.active)?.id ||
      sessions.value.find((session) => session.active)?._id ||
      "";
}
async function changeSession() {
  filters.page = 1;
  await Promise.all([loadApplications(), loadInventory()]);
}
async function changePage(page) {
  filters.page = Math.min(totalPages.value, Math.max(1, page));
  await loadApplications();
}
async function createHostel() {
  try {
    await apiService.createHostel(hostelForm);
    hostelForm.name = "";
    await loadInventory();
    Swal.fire({
      icon: "success",
      title: "Hostel added",
      timer: 1400,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire("Could not add hostel", message(error), "error");
  }
}
async function createBlock() {
  try {
    await apiService.createHostelBlock(blockForm);
    await loadInventory();
    Swal.fire({
      icon: "success",
      title: "Block added",
      timer: 1400,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire("Could not add block", message(error), "error");
  }
}
async function createRoom() {
  try {
    await apiService.createHostelRoom(roomForm);
    await loadInventory();
    Swal.fire({
      icon: "success",
      title: "Room added",
      timer: 1400,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire("Could not add room", message(error), "error");
  }
}
async function toggleInventory(type, record) {
  try {
    await apiService.updateAccommodationInventoryStatus(
      type,
      record._id,
      !record.active,
    );
    await loadInventory();
  } catch (error) {
    Swal.fire("Could not update inventory", message(error), "error");
  }
}
async function allocate(item) {
  let allocationInventory = inventory;
  const applicationSessionId = recordId(item.academicSessionId);
  if (
    applicationSessionId &&
    recordId(inventory.academicSessionId) !== applicationSessionId
  ) {
    try {
      const response = await apiService.getAccommodationInventory(
        applicationSessionId,
      );
      allocationInventory = response.data || response;
    } catch (error) {
      return Swal.fire("Could not load availability", message(error), "error");
    }
  }
  const isTransfer = Boolean(item.assignment);
  const currentRoomId = recordId(item.assignment?.roomId);
  const compatibleRooms = allocationInventory.rooms.filter((room) => {
    if (!room.active || room.availableCount <= 0) return false;
    if (isTransfer && recordId(room) === currentRoomId) return false;
    const block = allocationInventory.blocks.find(
      (candidate) => recordId(candidate) === recordId(room.blockId),
    );
    const hostel = allocationInventory.hostels.find(
      (candidate) => recordId(candidate) === recordId(block?.hostelId),
    );
    return (
      block?.active &&
      hostel?.active &&
      block.residentType === item.applicantType &&
      hostel.gender === item.gender
    );
  });
  const compatibleBlockIds = new Set(
    compatibleRooms.map((room) => recordId(room.blockId)),
  );
  const compatibleBlocks = allocationInventory.blocks.filter((block) =>
    compatibleBlockIds.has(recordId(block)),
  );
  const compatibleHostelIds = new Set(
    compatibleBlocks.map((block) => recordId(block.hostelId)),
  );
  const compatibleHostels = allocationInventory.hostels.filter((hostel) =>
    compatibleHostelIds.has(recordId(hostel)),
  );

  if (!compatibleRooms.length)
    return Swal.fire(
      "No matching space",
      "There is no other active room with free capacity for this resident type and gender.",
      "info",
    );

  const current = item.assignment;
  const currentAllocation = isTransfer
    ? `<div class="text-start border rounded bg-light p-3 mb-4">
        <div class="small text-uppercase text-muted fw-semibold mb-2">Current allocation</div>
        <div class="row g-2">
          <div class="col-6"><span class="small text-muted d-block">Hostel</span><strong>${escapeHtml(current.hostelId?.name)}</strong></div>
          <div class="col-6"><span class="small text-muted d-block">Block</span><strong>${escapeHtml(current.blockId?.name)}</strong></div>
          <div class="col-6"><span class="small text-muted d-block">Room</span><strong>${escapeHtml(current.roomId?.name)}</strong></div>
          <div class="col-6"><span class="small text-muted d-block">Bed slot</span><strong>Slot ${escapeHtml(current.slotNumber)}</strong></div>
        </div>
      </div>`
    : "";

  const result = await Swal.fire({
    title: isTransfer ? "Transfer allocation" : "Allocate accommodation",
    width: 620,
    html: `${currentAllocation}
      <div class="text-start">
        <div class="mb-3"><label for="allocation-hostel" class="form-label fw-semibold">${isTransfer ? "New hostel" : "Hostel"}</label><select id="allocation-hostel" class="form-select"><option value="">Select hostel</option></select></div>
        <div class="mb-3"><label for="allocation-block" class="form-label fw-semibold">${isTransfer ? "New block" : "Block"}</label><select id="allocation-block" class="form-select" disabled><option value="">Select block</option></select></div>
        <div class="mb-3"><label for="allocation-room" class="form-label fw-semibold">${isTransfer ? "New room" : "Room"}</label><select id="allocation-room" class="form-select" disabled><option value="">Select room</option></select><div id="allocation-availability" class="form-text"></div></div>
        <div><label for="allocation-note" class="form-label fw-semibold">${isTransfer ? "Transfer reason" : "Allocation note (optional)"}</label><textarea id="allocation-note" class="form-control" rows="3" maxlength="500" placeholder="${isTransfer ? "Enter the reason for this transfer" : "Add an optional note"}"></textarea></div>
      </div>`,
    showCancelButton: true,
    confirmButtonText: isTransfer ? "Transfer allocation" : "Allocate",
    focusConfirm: false,
    didOpen: () => {
      const hostelSelect = document.getElementById("allocation-hostel");
      const blockSelect = document.getElementById("allocation-block");
      const roomSelect = document.getElementById("allocation-room");
      const availability = document.getElementById("allocation-availability");

      compatibleHostels.forEach((hostel) =>
        hostelSelect.add(new Option(hostel.name, recordId(hostel))),
      );

      const resetSelect = (select, placeholder) => {
        select.replaceChildren(new Option(placeholder, ""));
        select.disabled = true;
      };
      hostelSelect.addEventListener("change", () => {
        resetSelect(blockSelect, "Select block");
        resetSelect(roomSelect, "Select room");
        availability.textContent = "";
        compatibleBlocks
          .filter((block) => recordId(block.hostelId) === hostelSelect.value)
          .forEach((block) =>
            blockSelect.add(new Option(block.name, recordId(block))),
          );
        blockSelect.disabled = blockSelect.options.length <= 1;
      });
      blockSelect.addEventListener("change", () => {
        resetSelect(roomSelect, "Select room");
        availability.textContent = "";
        compatibleRooms
          .filter((room) => recordId(room.blockId) === blockSelect.value)
          .forEach((room) =>
            roomSelect.add(
              new Option(
                `${room.name} · ${room.availableCount} of ${room.capacity} available`,
                recordId(room),
              ),
            ),
          );
        roomSelect.disabled = roomSelect.options.length <= 1;
      });
      roomSelect.addEventListener("change", () => {
        const room = compatibleRooms.find(
          (candidate) => recordId(candidate) === roomSelect.value,
        );
        availability.textContent = room
          ? `The first available bed slot will be assigned automatically.`
          : "";
      });
    },
    preConfirm: () => {
      const roomId = document.getElementById("allocation-room").value;
      const note = document.getElementById("allocation-note").value.trim();
      if (!roomId) return Swal.showValidationMessage("Select a destination room");
      if (isTransfer && !note)
        return Swal.showValidationMessage("Enter a reason for this transfer");
      return {
        roomId,
        note,
      };
    },
  });
  if (!result.isConfirmed) return;
  try {
    await apiService.allocateAccommodation(item._id, result.value);
    await loadApplications();
    Swal.fire(
      isTransfer ? "Allocation transferred" : "Accommodation allocated",
      isTransfer
        ? "The new room has been assigned and the previous bed space is now available."
        : "The accommodation assignment has been saved.",
      "success",
    );
  } catch (error) {
    Swal.fire(
      isTransfer ? "Could not transfer allocation" : "Could not allocate",
      message(error),
      "error",
    );
  }
}
async function viewAudit(item) {
  try {
    const response = await apiService.getAccommodationAudit(item._id);
    const events = response.data || response || [];
    const allocationLabel = (allocation) => {
      if (!allocation) return "Not allocated";
      return [
        allocation.hostelName,
        allocation.blockName,
        allocation.roomName,
        allocation.slotNumber ? `Slot ${allocation.slotNumber}` : "",
      ]
        .filter(Boolean)
        .map(escapeHtml)
        .join(" / ");
    };
    const eventDetails = (event) => {
      if (event.action === "bed_transferred") {
        return `<div class="small mt-2"><div><span class="text-muted">From:</span> ${allocationLabel(event.metadata?.from)}</div><div><span class="text-muted">To:</span> ${allocationLabel(event.metadata?.to)}</div><div><span class="text-muted">Reason:</span> ${escapeHtml(event.metadata?.reason)}</div></div>`;
      }
      if (event.action === "bed_allocated" && event.metadata?.to) {
        return `<div class="small mt-2"><span class="text-muted">Assigned:</span> ${allocationLabel(event.metadata.to)}</div>`;
      }
      return "";
    };
    const html = events.length
      ? events
          .map(
            (event) =>
              `<div class="text-start border-bottom py-2"><strong>${escapeHtml(title(event.action))}</strong><div class="small text-muted">${new Date(event.createdAt).toLocaleString()} · ${escapeHtml(event.actorId ? person({ userId: event.actorId }) : title(event.actorType))}</div>${eventDetails(event)}</div>`,
          )
          .join("")
      : '<p class="text-muted">No audit events recorded.</p>';
    await Swal.fire({
      title: `Audit · ${item.applicationNumber}`,
      html,
      width: 700,
      confirmButtonText: "Close",
    });
  } catch (error) {
    Swal.fire("Could not load audit history", message(error), "error");
  }
}
async function retry() {
  try {
    const result = await apiService.retryAccommodationAllocations();
    const data = result.data || result;
    await loadApplications();
    Swal.fire(
      "Allocation run complete",
      `${data.allocated} of ${data.scanned} waiting applications were allocated.`,
      "success",
    );
  } catch (error) {
    Swal.fire("Could not retry allocations", message(error), "error");
  }
}
function person(item) {
  const user = item.userId || {};
  return (
    [user.firstName, user.otherName, user.lastName].filter(Boolean).join(" ") ||
    "Unknown resident"
  );
}
function title(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
onMounted(async () => {
  await loadSessions();
  await Promise.all([loadApplications(), loadInventory()]);
});
</script>

<template>
  <div class="container-fluid accommodation-management p-3 p-lg-4">
    <header
      class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4"
    >
      <div>
        <h1>Accommodation Management</h1>
        <p class="text-muted mb-0">
          Manage applications, hostel capacity and session-based bed allocation.
        </p>
      </div>
      <button v-if="canAllocate" class="btn btn-outline-primary" @click="retry">
        <i class="bi bi-arrow-repeat me-2"></i>Retry waiting allocations
      </button>
    </header>

    <nav class="nav nav-tabs mb-4" aria-label="Accommodation views">
      <button
        class="nav-link rounded-bottom-0"
        :class="{ active: activeTab === 'applications' }"
        @click="activeTab = 'applications'"
      >
        Applications
      </button>
      <button
        class="nav-link rounded-bottom-0"
        :class="{ active: activeTab === 'inventory' }"
        @click="activeTab = 'inventory'"
      >
        Hostel inventory
      </button>
    </nav>

    <template v-if="activeTab === 'applications'">
      <section class="filter-band mb-3">
        <select
          v-model="filters.sessionId"
          class="form-select"
          @change="changeSession"
        >
          <option value="">All sessions</option>
          <option
            v-for="session in sessions"
            :key="session.id || session._id"
            :value="session.id || session._id"
          >
            {{ session.title || session.sessionYear }}
          </option>
        </select>
        <select
          v-model="filters.applicantType"
          class="form-select"
          @change="loadApplications"
        >
          <option value="">All resident types</option>
          <option value="internal">Internal students</option>
          <option value="external">External residents</option>
        </select>
        <select
          v-model="filters.status"
          class="form-select"
          @change="loadApplications"
        >
          <option value="">All statuses</option>
          <option
            v-for="status in [
              'draft',
              'awaiting_email_verification',
              'awaiting_agreement',
              'awaiting_payment',
              'payment_pending_review',
              'paid_awaiting_allocation',
              'allocated',
              'cancelled',
              'expired',
            ]"
            :key="status"
            :value="status"
          >
            {{ title(status) }}
          </option>
        </select>
        <button
          class="btn btn-outline-secondary"
          :disabled="loading"
          @click="loadApplications"
        >
          <i class="bi bi-arrow-clockwise"></i
          ><span class="visually-hidden">Refresh</span>
        </button>
      </section>
      <div
        class="table-responsive applications-table-wrap bg-white border rounded"
      >
        <table class="table align-middle mb-0">
          <thead>
            <tr>
              <th>Resident</th>
              <th>Type</th>
              <th>Session</th>
              <th>Status</th>
              <th>Bed space</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center py-5">
                <span class="spinner-border text-primary"></span>
              </td>
            </tr>
            <tr v-else-if="!applications.length">
              <td colspan="6" class="text-center text-muted py-5">
                No accommodation applications match these filters.
              </td>
            </tr>
            <tr v-for="item in applications" v-else :key="item._id">
              <td>
                <strong>{{ person(item) }}</strong
                ><small class="d-block text-muted"
                  >{{ item.applicationNumber }} ·
                  {{ item.userId?.email }}</small
                >
              </td>
              <td>
                {{ title(item.applicantType)
                }}<small class="d-block text-muted"
                  >{{ title(item.category) }} · {{ title(item.gender) }}</small
                >
              </td>
              <td>
                {{
                  item.academicSessionId?.sessionYear ||
                  item.academicSessionId?.title ||
                  "—"
                }}
              </td>
              <td>
                <span class="badge text-bg-light border">{{
                  title(item.status)
                }}</span>
              </td>
              <td>
                <span v-if="item.assignment"
                  >{{ item.assignment.hostelId?.name }} /
                  {{ item.assignment.blockId?.name }} /
                  {{ item.assignment.roomId?.name }} · Slot
                  {{ item.assignment.slotNumber }}</span
                ><span v-else class="text-muted">Not allocated</span>
              </td>
              <td class="text-end">
                <div class="dropdown d-inline-block">
                  <button
                    :id="`accommodation-actions-${item._id}`"
                    type="button"
                    class="btn btn-sm action-menu-trigger dropdown-toggle"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    aria-haspopup="true"
                    :aria-label="`Actions for ${person(item)}`"
                    title="More actions"
                  >
                    <i class="bi bi-three-dots-vertical" aria-hidden="true"></i>
                  </button>
                  <ul
                    class="dropdown-menu dropdown-menu-end shadow-sm"
                    :aria-labelledby="`accommodation-actions-${item._id}`"
                  >
                    <li
                      v-if="
                        canAllocate &&
                        ['paid_awaiting_allocation', 'allocated'].includes(
                          item.status,
                        )
                      "
                    >
                      <button
                        type="button"
                        class="dropdown-item"
                        @click="allocate(item)"
                      >
                        <i
                          class="bi me-2"
                          :class="
                            item.assignment
                              ? 'bi-arrow-left-right'
                              : 'bi-building-add'
                          "
                          aria-hidden="true"
                        ></i>
                        {{ item.assignment ? "Transfer" : "Allocate" }}
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        class="dropdown-item"
                        @click="viewAudit(item)"
                      >
                        <i
                          class="bi bi-clock-history me-2"
                          aria-hidden="true"
                        ></i>
                        Audit history
                      </button>
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="d-flex justify-content-between align-items-center mt-2">
        <p class="small text-muted mb-0">
          {{ total }} application{{ total === 1 ? "" : "s" }}
        </p>
        <div v-if="totalPages > 1" class="btn-group">
          <button
            class="btn btn-sm btn-outline-secondary"
            :disabled="filters.page <= 1"
            @click="changePage(filters.page - 1)"
          >
            <i class="bi bi-chevron-left"></i></button
          ><span class="btn btn-sm btn-light disabled"
            >{{ filters.page }} / {{ totalPages }}</span
          ><button
            class="btn btn-sm btn-outline-secondary"
            :disabled="filters.page >= totalPages"
            @click="changePage(filters.page + 1)"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <section v-if="canConfigure" class="configuration-band mb-4">
        <form @submit.prevent="createHostel">
          <h2>Add hostel</h2>
          <input
            v-model.trim="hostelForm.name"
            class="form-control"
            placeholder="Hostel name"
            required
          /><select v-model="hostelForm.gender" class="form-select">
            <option value="female">Female</option>
            <option value="male">Male</option></select
          ><button class="btn btn-primary">
            <i class="bi bi-plus-lg"></i
            ><span class="visually-hidden">Add hostel</span>
          </button>
        </form>
        <form @submit.prevent="createBlock">
          <h2>Add block</h2>
          <select v-model="blockForm.hostelId" class="form-select" required>
            <option value="" disabled>Select hostel</option>
            <option
              v-for="hostel in inventory.hostels"
              :key="hostel._id"
              :value="hostel._id"
            >
              {{ hostel.name }}
            </option></select
          ><input
            v-model.trim="blockForm.name"
            class="form-control"
            placeholder="Block A"
            required
          /><select v-model="blockForm.residentType" class="form-select">
            <option value="internal">Internal</option>
            <option value="external">External</option></select
          ><button class="btn btn-primary">
            <i class="bi bi-plus-lg"></i
            ><span class="visually-hidden">Add block</span>
          </button>
        </form>
        <form @submit.prevent="createRoom">
          <h2>Add room</h2>
          <select v-model="roomForm.blockId" class="form-select" required>
            <option value="" disabled>Select block</option>
            <option
              v-for="block in inventory.blocks"
              :key="block._id"
              :value="block._id"
            >
              {{ block.name }} · {{ title(block.residentType) }}
            </option></select
          ><input
            v-model.trim="roomForm.name"
            class="form-control"
            placeholder="A1"
            required
          /><input
            v-model.number="roomForm.capacity"
            type="number"
            min="1"
            max="100"
            class="form-control"
            aria-label="Bed capacity"
            required
          /><button class="btn btn-primary">
            <i class="bi bi-plus-lg"></i
            ><span class="visually-hidden">Add room</span>
          </button>
        </form>
      </section>
      <div class="inventory-grid">
        <section
          v-for="hostel in inventory.hostels"
          :key="hostel._id"
          class="inventory-section"
        >
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <h2>{{ hostel.name }}</h2>
              <p>{{ title(hostel.gender) }} hostel</p>
            </div>
            <button
              v-if="canConfigure"
              type="button"
              class="btn btn-sm"
              :class="
                hostel.active ? 'btn-outline-success' : 'btn-outline-secondary'
              "
              @click="toggleInventory('hostel', hostel)"
            >
              <i
                class="bi"
                :class="hostel.active ? 'bi-toggle-on' : 'bi-toggle-off'"
              ></i>
              {{ hostel.active ? "Active" : "Inactive" }}
            </button>
          </div>
          <div
            v-for="block in inventory.blocks.filter(
              (item) => String(item.hostelId) === String(hostel._id),
            )"
            :key="block._id"
            class="block-row"
          >
            <strong>{{ block.name }}</strong
            ><span>{{ title(block.residentType) }}</span
            ><button
              v-if="canConfigure"
              type="button"
              class="btn btn-sm btn-link p-0"
              @click="toggleInventory('block', block)"
            >
              {{ block.active ? "Deactivate" : "Activate" }}
            </button>
            <small
              >{{
                inventory.rooms.filter(
                  (room) => String(room.blockId) === String(block._id),
                ).length
              }}
              rooms ·
              {{
                inventory.rooms
                  .filter((room) => String(room.blockId) === String(block._id))
                  .reduce((sum, room) => sum + room.capacity, 0)
              }}
              slots</small
            >
            <div class="room-list">
              <div
                v-for="room in inventory.rooms.filter(
                  (item) => String(item.blockId) === String(block._id),
                )"
                :key="room._id"
              >
                <span
                  >{{ room.name }} · {{ room.occupiedCount }}/{{
                    room.capacity
                  }}
                  occupied</span
                ><button
                  v-if="canConfigure"
                  type="button"
                  class="btn btn-sm btn-link"
                  @click="toggleInventory('room', room)"
                >
                  {{ room.active ? "Deactivate" : "Activate" }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.accommodation-management h1 {
  color: #176867;
  font-size: 2rem;
  font-weight: 700;
}
.filter-band {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 240px)) 44px;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e3e7ea;
}
.configuration-band {
  display: grid;
  gap: 1px;
  background: #dfe4e7;
  border: 1px solid #dfe4e7;
}
.configuration-band form {
  display: grid;
  grid-template-columns: 180px repeat(3, minmax(130px, 1fr)) 44px;
  gap: 0.75rem;
  align-items: end;
  background: #fff;
  padding: 1rem;
}
.configuration-band h2 {
  font-size: 1rem;
  margin: 0;
  align-self: center;
}
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.inventory-section {
  background: #fff;
  border-top: 3px solid #176867;
  padding: 1.25rem;
}
.inventory-section h2 {
  font-size: 1.15rem;
  margin: 0;
}
.inventory-section p {
  color: #6c757d;
  margin: 0;
}
.block-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.5rem 1rem;
  padding: 0.8rem 0;
  border-top: 1px solid #e8ecef;
  margin-top: 0.8rem;
}
.block-row small,
.room-list {
  grid-column: 1/-1;
}
.room-list {
  border-left: 2px solid #e8ecef;
  padding-left: 0.75rem;
}
.room-list > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 36px;
}
.action-menu-trigger {
  display: inline-grid;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  place-items: center;
  color: #495057;
  border: 1px solid transparent;
  border-radius: 0.375rem;
}
.action-menu-trigger::after {
  display: none;
}
.action-menu-trigger:hover,
.action-menu-trigger:focus-visible,
.action-menu-trigger[aria-expanded="true"] {
  color: #176867;
  background: #eef7f6;
  border-color: #b9d7d5;
}
.action-menu-trigger:focus-visible {
  box-shadow: 0 0 0 0.2rem rgb(23 104 103 / 20%);
}
.dropdown-menu {
  min-width: 11rem;
  padding: 0.35rem;
  border-color: #e3e7ea;
}
.dropdown-item {
  display: flex;
  align-items: center;
  min-height: 2.5rem;
  border-radius: 0.25rem;
}
.dropdown-item:active {
  color: #fff;
  background: #176867;
}
@media (min-width: 992px) {
  .applications-table-wrap {
    overflow: visible;
  }
}
@media (max-width: 991px) {
  .applications-table-wrap:has(.dropdown-menu.show) {
    padding-bottom: 5.5rem;
  }
  .configuration-band form {
    grid-template-columns: 1fr 1fr;
  }
  .inventory-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 575px) {
  .filter-band,
  .configuration-band form {
    grid-template-columns: 1fr;
  }
  .block-row {
    grid-template-columns: 1fr auto;
  }
  .block-row small {
    grid-column: 1/-1;
  }
}
</style>
