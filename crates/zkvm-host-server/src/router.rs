use std::collections::HashMap;
use std::sync::Arc;

use crate::backend::ProverBackend;

/// Holds every registered `ProverBackend` by name. Selection is always
/// explicit-by-name (`get(Some("stark"))`) or falls back to a configured
/// default (`get(None)`) -- there is no cycle-count/cost-based auto-selection
/// yet, since that needs real benchmarking data across more than one real
/// backend to be anything but guesswork.
#[derive(Clone)]
pub struct ProverRouter {
    backends: HashMap<String, Arc<dyn ProverBackend>>,
    default_backend: String,
}

impl ProverRouter {
    pub fn new(default_backend: impl Into<String>) -> Self {
        Self {
            backends: HashMap::new(),
            default_backend: default_backend.into(),
        }
    }

    pub fn register(&mut self, backend: Arc<dyn ProverBackend>) {
        self.backends.insert(backend.name().to_string(), backend);
    }

    pub fn names(&self) -> Vec<String> {
        let mut names: Vec<String> = self.backends.keys().cloned().collect();
        names.sort();
        names
    }

    pub fn default_name(&self) -> &str {
        &self.default_backend
    }

    pub fn get(&self, name: Option<&str>) -> Option<Arc<dyn ProverBackend>> {
        self.backends
            .get(name.unwrap_or(&self.default_backend))
            .cloned()
    }
}
