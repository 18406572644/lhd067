export function useProject() {
  const projectStore = useProjectStore()
  const editorStore = useEditorStore()

  async function loadProject(id: string) {
    projectStore.setCurrentProject(id)
    const project = projectStore.getCurrentProject
    if (project) {
      editorStore.loadFromProject(project)
    }
  }

  function saveCurrent(): boolean {
    const project = projectStore.getCurrentProject
    if (!project) {
      return false
    }
    editorStore.saveToProject()
    return true
  }

  function createNew(): string {
    editorStore.resetEditor()
    const project = projectStore.createProject()
    projectStore.setCurrentProject(project.id)
    return project.id
  }

  async function deleteWithConfirm(id: string): Promise<boolean> {
    try {
      await ElMessageBox.confirm(
        '确定要删除该方案吗？此操作不可恢复。',
        '删除确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      projectStore.deleteProject(id)
      return true
    } catch {
      return false
    }
  }

  return {
    loadProject,
    saveCurrent,
    createNew,
    deleteWithConfirm
  }
}
