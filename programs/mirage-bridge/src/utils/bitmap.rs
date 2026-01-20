/// Checks if a bit is set in a u128 array bitmap
pub fn is_bit_set(bitmap: &[u128; 8], index: usize) -> bool {
    let array_idx = index / 128;
    let bit_idx = index % 128;
    if array_idx >= 8 {
        return false;
    }
    (bitmap[array_idx] & (1u128 << bit_idx)) != 0
}

/// Sets a bit in a u128 array bitmap
pub fn set_bit(bitmap: &mut [u128; 8], index: usize) {
    let array_idx = index / 128;
    let bit_idx = index % 128;
    if array_idx < 8 {
        bitmap[array_idx] |= 1u128 << bit_idx;
    }
}

/// Shifts the bitmap left by `shift` bits (simulating a sliding window)
/// This is an expensive operation for large bitmaps, but 128 bytes is manageable.
/// For simplicity, since we only move forward, we can just clear bits that fall out of window
/// and mapping `sequence % WINDOW`? No, sequence is strictly increasing.
/// Relative indexing: `index = last_sequence - sequence`.
/// If `sequence > last_sequence`, we shift the window.
pub fn shift_bitmap(bitmap: &mut [u128; 8], shift: usize) {
    if shift >= 1024 {
        *bitmap = [0; 8];
        return;
    }

    // Naive implementation: for each bit we want to keep, move it.
    // Or bitwise operations across u128 boundaries.
    // Since this is Solana BPF, let's keep it simple.
    // If shift is small, iterating is fine.
    // If shift is large, resetting is fine.
    
    // Actually, shifting a multi-word bitmap is tricky in Rust without a library.
    // Let's implement a simple version:
    // Create new empty bitmap.
    // Iterate old bitmap, if bit I is set, set bit (I + shift) in new bitmap?
    // No, we are shifting the WINDOW.
    // If new sequence is N, and old was O. Shift = N - O.
    // Old bit 0 (was O) becomes bit Shift (relative to N).
    // So we shift RIGHT (bits move to higher indices).
    
    let mut new_bitmap = [0u128; 8];
    
    for i in 0..(1024 - shift) {
        if is_bit_set(bitmap, i) {
            set_bit(&mut new_bitmap, i + shift);
        }
    }
    
    *bitmap = new_bitmap;
}
